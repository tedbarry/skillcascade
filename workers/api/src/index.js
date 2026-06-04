import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware, hasPermission } from './middleware/auth.js'
import profiles from './routes/profiles.js'
import clients from './routes/clients.js'
import assessments from './routes/assessments.js'
import programs from './routes/programs.js'
import sessions from './routes/sessions.js'
import goals from './routes/goals.js'
import organizations from './routes/organizations.js'
import subscriptions from './routes/subscriptions.js'
import reports from './routes/reports.js'
import audit from './routes/audit.js'
import aiChats from './routes/ai-chats.js'
import generic from './routes/generic.js'
import clientFiles from './routes/client-files.js'
import clientContacts from './routes/client-contacts.js'
import staffAvailability from './routes/staff-availability.js'
import sessionNotes from './routes/session-notes.js'
import aiProxy from './routes/ai-proxy.js'
import supportChat from './routes/support-chat.js'
import stripeCheckout from './routes/stripe-checkout.js'
import stripePortal from './routes/stripe-portal.js'
import stripeWebhook from './routes/stripe-webhook.js'
import passageRunner from './routes/passage-runner.js'
import reportGenerator from './routes/report-generator.js'
import agencyOps from './routes/agency-ops.js'

const app = new Hono()

// CORS — allow SkillCascade frontend origins
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Authorization', 'Content-Type'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}))

// Health check (no auth)
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Public route: Stripe webhook (no auth — uses signature verification)
app.route('/webhooks/stripe', stripeWebhook)

// Public route: contact form submission
app.post('/api/contact', async (c) => {
  const { query: dbQuery } = await import('./db.js')
  const body = await c.req.json()
  const result = await dbQuery(c.env,
    "INSERT INTO contact_submissions (name, email, subject, message) VALUES ($1, $2, $3, $4) RETURNING id",
    [body.name, body.email, body.subject, body.message]
  )
  return c.json({ data: result.rows[0] }, 201)
})

// All other routes require auth
app.use('/api/*', authMiddleware)

// Mount route handlers
app.route('/api/profiles', profiles)
app.route('/api/clients', clients)
app.route('/api/assessments', assessments)
app.route('/api/programs', programs)
app.route('/api/sessions', sessions)
app.route('/api/goals', goals)
app.route('/api/organizations', organizations)
app.route('/api/subscriptions', subscriptions)
app.route('/api/reports', reports)
app.route('/api/audit', audit)
app.route('/api/ai-chats', aiChats)
app.route('/api/data', generic)
app.route('/api/client-files', clientFiles)
app.route('/api/client-contacts', clientContacts)
app.route('/api/staff-availability', staffAvailability)
app.route('/api/session-notes', sessionNotes)
app.route('/api/ai-proxy', aiProxy)
app.route('/api/support-chat', supportChat)
app.route('/api/stripe-checkout', stripeCheckout)
app.route('/api/stripe-portal', stripePortal)
app.route('/api/passage-runner', passageRunner)
app.route('/api/report-generator', reportGenerator)
app.route('/api/agency-ops', agencyOps)

// RPC-style endpoints for stored procedures
app.post('/api/rpc/ensure_user_org', async (c) => {
  const { query: dbQuery } = await import('./db.js')
  const userId = c.get('userId')
  const result = await dbQuery(c.env,
    "SELECT ensure_user_org($1) as org_id",
    [userId]
  )
  return c.json({ data: result.rows[0] })
})

app.post('/api/rpc/create_client_for_user', async (c) => {
  const { query: dbQuery } = await import('./db.js')
  const profile = c.get('profile')
  if (!hasPermission(profile, 'clients', 'create')) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  const userId = c.get('userId')
  const body = await c.req.json()
  const result = await dbQuery(c.env,
    "SELECT create_client_for_user($1, $2) as result",
    [userId, body.client_name]
  )
  return c.json({ data: result.rows[0]?.result })
})

app.post('/api/rpc/delete_client_for_user', async (c) => {
  const { query: dbQuery } = await import('./db.js')
  const profile = c.get('profile')
  if (!hasPermission(profile, 'clients', 'delete')) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  const userId = c.get('userId')
  const body = await c.req.json()
  const result = await dbQuery(c.env,
    "SELECT delete_client_for_user($1, $2) as success",
    [userId, body.client_id]
  )
  return c.json({ data: result.rows[0] })
})

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404))

// Error handler
app.onError((err, c) => {
  console.error('API error:', err.message, err.stack)
  return c.json({ error: 'Internal server error' }, 500)
})

export default app
