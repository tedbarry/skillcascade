// Supabase Edge Function: AI Proxy
// Proxies OpenAI API calls so the API key stays server-side.
// Deploy: supabase functions deploy ai-proxy --no-verify-jwt
//
// Environment variables needed (set via Supabase dashboard):
//   OPENAI_API_KEY — your OpenAI API key

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify the user is authenticated via Supabase JWT
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

    // Verify user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    const { messages, model = 'gpt-4o-mini', max_tokens = 2000, temperature = 0.7 } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get API key — first check user's own key, then fall back to platform key
    let apiKey = ''

    // Check if user has their own API key stored
    const { data: settings } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', user.id)
      .single()

    if (settings?.settings?.ai_api_key) {
      apiKey = settings.settings.ai_api_key
    } else {
      // Fall back to platform-wide key
      apiKey = Deno.env.get('OPENAI_API_KEY') || ''
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'No API key configured. Please add your OpenAI API key in settings.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Call OpenAI
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, max_tokens, temperature }),
    })

    if (!openaiRes.ok) {
      const err = await openaiRes.json().catch(() => ({}))
      return new Response(JSON.stringify({ error: err.error?.message || `OpenAI error: ${openaiRes.status}` }), {
        status: openaiRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await openaiRes.json()
    const content = data.choices?.[0]?.message?.content || 'No response generated.'

    // Audit log the AI usage
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'ai_query',
      resource_type: 'ai_assistant',
      metadata: { model, tokens: data.usage?.total_tokens },
    })

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
