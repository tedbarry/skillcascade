/**
 * Shared AI client for SkillCascade's managed AI proxy.
 * Requests route through the platform's AWS Bedrock-backed worker.
 */
import { supabase } from './supabase.js'

const API_URL = import.meta.env.VITE_API_URL || 'https://skillcascade-api.teddybahary.workers.dev'

/**
 * Send messages to the AI proxy and return the response text.
 *
 * @param {Object} options
 * @param {Array<{role: string, content: string}>} options.messages - Chat messages array
 * @param {string} [options.model='gpt-4o-mini'] - Frontend model alias mapped server-side
 * @param {number} [options.maxTokens=2000] - Max tokens in response
 * @param {number} [options.temperature=0.7] - Temperature
 * @param {AbortSignal} [options.signal] - Optional abort signal
 * @returns {Promise<string>} The AI response text
 */
export async function callAI({ messages, model = 'gpt-4o-mini', maxTokens = 2000, temperature = 0.7, signal }) {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Please sign in to use AI features.')
  }

  const res = await fetch(`${API_URL}/api/ai-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      messages,
      model,
      max_tokens: maxTokens,
      temperature,
    }),
    signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    if (res.status === 429) throw new Error('Rate limit reached. Try again in a minute.')
    if ([400, 500].includes(res.status) && /no api key|ai service not configured/i.test(err.error || '')) {
      throw new Error('AI service is not configured for this workspace. Contact support.')
    }
    throw new Error(err.error || `API error: ${res.status}`)
  }

  const data = await res.json()
  return data.content || 'No response generated.'
}
