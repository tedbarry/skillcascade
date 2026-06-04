// Supabase Edge Function: AI Proxy
// Routes AI calls through AWS Bedrock (Claude) for HIPAA compliance.
// Deploy: supabase functions deploy ai-proxy --no-verify-jwt
//
// Environment variables needed (set via Supabase dashboard):
//   AWS_ACCESS_KEY_ID — Bedrock IAM user access key
//   AWS_SECRET_ACCESS_KEY — Bedrock IAM user secret key

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore — aws4fetch works in Deno via esm.sh
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.18'
import { getCorsHeaders } from '../_shared/cors.ts'

// Simple in-memory rate limiter: max 20 requests per minute per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000

function checkRateLimit(userId: string): boolean {
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
const HAIKU_MODEL_ID = 'us.anthropic.claude-haiku-4-5-20251001-v1:0'
const SONNET_MODEL_ID = 'us.anthropic.claude-sonnet-4-6'

const MODEL_MAP: Record<string, string> = {
  'gpt-4o-mini': HAIKU_MODEL_ID,
  'gpt-4o': SONNET_MODEL_ID,
  'claude-haiku': HAIKU_MODEL_ID,
  'claude-sonnet': SONNET_MODEL_ID,
  'claude-haiku-4-5': HAIKU_MODEL_ID,
  'claude-sonnet-4-6': SONNET_MODEL_ID,
}

// Convert OpenAI-style messages to Bedrock/Claude format
function convertMessages(messages: any[]): { system: string | undefined; messages: any[] } {
  let system: string | undefined
  const converted: any[] = []

  for (const msg of messages) {
    if (msg.role === 'system') {
      // Claude uses top-level system parameter, not a system message
      system = (system ? system + '\n\n' : '') + (typeof msg.content === 'string' ? msg.content : '')
      continue
    }

    // Handle vision messages (image_url content)
    if (Array.isArray(msg.content)) {
      const parts: any[] = []
      for (const part of msg.content) {
        if (part.type === 'text') {
          parts.push({ type: 'text', text: part.text })
        } else if (part.type === 'image_url' && part.image_url?.url) {
          const url = part.image_url.url
          if (url.startsWith('data:')) {
            // Base64 image — extract media type and data
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

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Rate limit
    if (!checkRateLimit(user.id)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please wait a minute.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request
    const body = await req.json()
    const messages = body.messages
    const requestedModel = body.model || 'gpt-4o-mini'
    const max_tokens = Math.min(body.max_tokens || 2000, 4000)
    const temperature = Math.min(Math.max(body.temperature ?? 0.7, 0), 1)

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get AWS credentials
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID')
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY')

    if (!accessKeyId || !secretAccessKey) {
      return new Response(JSON.stringify({ error: 'AI service not configured. Contact support.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Map model name
    const modelId = MODEL_MAP[requestedModel] || MODEL_MAP['gpt-4o-mini']

    // Convert messages to Claude format
    const { system, messages: claudeMessages } = convertMessages(messages)

    // Build Bedrock request
    const bedrockBody: any = {
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
      return new Response(JSON.stringify({ error: `AI service error: ${bedrockRes.status}` }), {
        status: bedrockRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await bedrockRes.json()
    const content = data.content?.[0]?.text || 'No response generated.'

    // Audit log (non-blocking, ignore errors)
    try {
      await supabase.from('audit_log').insert({
        user_id: user.id,
        action: 'ai_query',
        resource_type: 'ai_assistant',
        metadata: {
          model: modelId,
          tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
          input_tokens: data.usage?.input_tokens,
          output_tokens: data.usage?.output_tokens,
        },
      })
    } catch {
      // Ignore audit log failures
    }

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('AI proxy error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
