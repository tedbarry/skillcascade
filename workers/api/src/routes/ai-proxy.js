import { Hono } from 'hono'
import { AwsClient } from 'aws4fetch'

const app = new Hono()

// Simple in-memory rate limiter: max 20 requests per minute per user
const rateLimitMap = new Map()
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000

function checkRateLimit(userId) {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

// Map frontend model names to Bedrock model IDs
const MODEL_MAP = {
  'gpt-4o-mini': 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
  'gpt-4o': 'us.anthropic.claude-sonnet-4-20250514-v1:0',
  'claude-haiku': 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
  'claude-sonnet': 'us.anthropic.claude-sonnet-4-20250514-v1:0',
}

// Convert OpenAI-style messages to Bedrock/Claude format
function convertMessages(messages) {
  let system
  const converted = []

  for (const msg of messages) {
    if (msg.role === 'system') {
      system = (system ? system + '\n\n' : '') + (typeof msg.content === 'string' ? msg.content : '')
      continue
    }

    // Handle vision messages (image_url content)
    if (Array.isArray(msg.content)) {
      const parts = []
      for (const part of msg.content) {
        if (part.type === 'text') {
          parts.push({ type: 'text', text: part.text })
        } else if (part.type === 'image_url' && part.image_url?.url) {
          const url = part.image_url.url
          if (url.startsWith('data:')) {
            const match = url.match(/^data:(image\/\w+);base64,(.+)$/)
            if (match) {
              parts.push({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: match[1],
                  data: match[2],
                },
              })
            }
          }
        }
      }
      converted.push({ role: msg.role, content: parts })
    } else {
      converted.push({ role: msg.role, content: msg.content })
    }
  }

  return { system, messages: converted }
}

// POST /
app.post('/', async (c) => {
  const userId = c.get('userId')

  // Rate limit
  if (!checkRateLimit(userId)) {
    return c.json({ error: 'Rate limit exceeded. Please wait a minute.' }, 429)
  }

  // Parse request
  const body = await c.req.json()
  const messages = body.messages
  const requestedModel = body.model || 'gpt-4o-mini'
  const max_tokens = Math.min(body.max_tokens || 2000, 16000)
  const temperature = Math.min(Math.max(body.temperature ?? 0.7, 0), 1)

  if (!messages || !Array.isArray(messages)) {
    return c.json({ error: 'Messages array is required' }, 400)
  }

  // Get AWS credentials
  const accessKeyId = c.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = c.env.AWS_SECRET_ACCESS_KEY

  if (!accessKeyId || !secretAccessKey) {
    return c.json({ error: 'AI service not configured. Contact support.' }, 500)
  }

  // Map model name
  const modelId = MODEL_MAP[requestedModel] || MODEL_MAP['gpt-4o-mini']

  // Convert messages to Claude format
  const { system, messages: claudeMessages } = convertMessages(messages)

  // Build Bedrock request
  const bedrockBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens,
    temperature,
    messages: claudeMessages,
  }
  if (system) {
    bedrockBody.system = system
  }

  // Call AWS Bedrock
  const aws = new AwsClient({
    accessKeyId,
    secretAccessKey,
    region: 'us-east-1',
    service: 'bedrock',
  })

  const bedrockUrl = `https://bedrock-runtime.us-east-1.amazonaws.com/model/${modelId}/invoke`

  const bedrockRes = await aws.fetch(bedrockUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bedrockBody),
  })

  if (!bedrockRes.ok) {
    const errText = await bedrockRes.text()
    console.error('Bedrock error:', bedrockRes.status, errText)
    return c.json({ error: `AI service error: ${bedrockRes.status}` }, bedrockRes.status)
  }

  const data = await bedrockRes.json()
  const content = data.content?.[0]?.text || 'No response generated.'

  // Audit log (non-blocking, ignore errors)
  try {
    const { query: dbQuery } = await import('../db.js')
    await dbQuery(c.env,
      `INSERT INTO audit_log (user_id, action, resource_type, metadata)
       VALUES ($1, $2, $3, $4)`,
      [
        userId,
        'ai_query',
        'ai_assistant',
        JSON.stringify({
          model: modelId,
          tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
          input_tokens: data.usage?.input_tokens,
          output_tokens: data.usage?.output_tokens,
        }),
      ]
    )
  } catch {
    // Ignore audit log failures
  }

  return c.json({ content })
})

export default app
