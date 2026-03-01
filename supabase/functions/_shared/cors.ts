const ALLOWED_ORIGINS = [
  'https://skillcascade.com',
  'https://www.skillcascade.com',
  'http://localhost:5173',
  'http://localhost:4173',
]

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, content-type',
    'Vary': 'Origin',
  }
}

// Keep backward compat export for existing code
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, content-type',
}
