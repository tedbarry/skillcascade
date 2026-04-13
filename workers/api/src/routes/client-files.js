import { Hono } from 'hono'
import { AwsClient } from 'aws4fetch'
import { query } from '../db.js'
import { canAccessClient, hasClinicalManagerRole } from '../middleware/access.js'

const app = new Hono()

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
const DEFAULT_REGION = 'us-east-1'
const LEGACY_STORAGE_WARNING = 'AWS document storage is not configured yet. This upload used legacy in-app storage.'
const VALID_CATEGORIES = new Set(['general', 'report', 'authorization', 'assessment', 'correspondence'])
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'])
const DOCUMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'txt', 'csv'])

function getStorageConfig(env) {
  const bucket = env.AWS_S3_BUCKET || env.S3_BUCKET || null
  if (!bucket) return null

  const prefix = (env.AWS_S3_PREFIX || '').trim().replace(/^\/+|\/+$/g, '')
  return {
    bucket,
    region: env.AWS_S3_REGION || env.AWS_REGION || DEFAULT_REGION,
    prefix,
  }
}

function getStorageCredentials(env) {
  const accessKeyId = env.AWS_S3_ACCESS_KEY_ID || env.AWS_ACCESS_KEY_ID || null
  const secretAccessKey = env.AWS_S3_SECRET_ACCESS_KEY || env.AWS_SECRET_ACCESS_KEY || null
  if (!accessKeyId || !secretAccessKey) return null

  return { accessKeyId, secretAccessKey }
}

function getStorageClient(env, region) {
  const credentials = getStorageCredentials(env)
  if (!credentials) return null

  return new AwsClient({
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    service: 's3',
    region,
  })
}

function getExtension(filename = '') {
  const clean = filename.trim().toLowerCase()
  if (!clean.includes('.')) return ''
  return clean.split('.').pop()
}

function sanitizeFilename(filename = '') {
  return filename
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'document'
}

function getFileType(filename = '') {
  const ext = getExtension(filename)
  if (ext === 'pdf') return 'pdf'
  if (IMAGE_EXTENSIONS.has(ext)) return 'image'
  return 'document'
}

function inferContentType(filename = '', fallback = 'application/octet-stream') {
  const ext = getExtension(filename)
  const map = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    csv: 'text/csv',
  }
  return map[ext] || fallback
}

function buildContentDisposition(filename, asAttachment) {
  const safeFallback = (filename || 'document')
    .replace(/["\r\n]/g, '')
    .replace(/[^\x20-\x7E]/g, '_')

  const utf8Name = encodeURIComponent(filename || 'document')
  const disposition = asAttachment ? 'attachment' : 'inline'
  return `${disposition}; filename="${safeFallback}"; filename*=UTF-8''${utf8Name}`
}

function buildObjectKey(profile, clientId, filename, prefix = '') {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const safeFilename = sanitizeFilename(filename)
  const baseKey = `client-files/${profile.org_id}/${clientId}/${year}/${month}/${crypto.randomUUID()}-${safeFilename}`
  return prefix ? `${prefix}/${baseKey}` : baseKey
}

function buildS3Url(bucket, region, key) {
  const encodedKey = key.split('/').map(part => encodeURIComponent(part)).join('/')
  return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`
}

function buildLegacyDataUrl(file, fileBuffer) {
  const mimeType = file.type || inferContentType(file.name)
  const base64 = Buffer.from(fileBuffer).toString('base64')
  return `data:${mimeType};base64,${base64}`
}

async function readAwsError(response) {
  const errorText = await response.text().catch(() => '')
  if (response.status === 403) {
    return 'Managed document storage is configured, but the AWS credentials do not have S3 access.'
  }
  return `${response.status} ${errorText}`.trim()
}

function decodeLegacyDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl || '')
  if (!match) return null

  return {
    contentType: match[1] || 'application/octet-stream',
    body: Buffer.from(match[2], 'base64'),
  }
}

function getUploadFields(form) {
  const clientId = String(form.get('client_id') || '').trim()
  const category = String(form.get('category') || 'general').trim().toLowerCase()
  const notes = String(form.get('notes') || '').trim()
  const file = form.get('file')

  return {
    clientId,
    category: VALID_CATEGORIES.has(category) ? category : 'general',
    notes,
    file,
  }
}

async function getClientFile(env, fileId) {
  const result = await query(env,
    `SELECT id, client_id, org_id, filename, file_type, file_size, storage_key, category, notes, uploaded_by, created_at
     FROM client_files
     WHERE id = $1`,
    [fileId]
  )
  return result.rows[0] || null
}

async function removeManagedObject(env, storageKey) {
  const storageConfig = getStorageConfig(env)
  const storageClient = storageConfig ? getStorageClient(env, storageConfig.region) : null
  if (!storageKey || !storageConfig || !storageClient) {
    throw new Error('AWS document storage is not configured for managed file deletion.')
  }

  const deleteRes = await storageClient.fetch(
    buildS3Url(storageConfig.bucket, storageConfig.region, storageKey),
    { method: 'DELETE' },
  )

  if (!deleteRes.ok && deleteRes.status !== 404) {
    throw new Error(`Failed to remove managed file: ${await readAwsError(deleteRes)}`)
  }
}

app.post('/upload', async (c) => {
  const profile = c.get('profile')
  if (!hasClinicalManagerRole(profile)) {
    return c.json({ error: 'Only BCBA and admin roles can upload files.' }, 403)
  }

  const form = await c.req.formData()
  const { clientId, category, notes, file } = getUploadFields(form)

  if (!clientId) return c.json({ error: 'client_id is required.' }, 400)
  if (!file || typeof file.arrayBuffer !== 'function') {
    return c.json({ error: 'A file upload is required.' }, 400)
  }
  if (!await canAccessClient(c.env, profile, clientId)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const ext = getExtension(file.name || '')
  if (!IMAGE_EXTENSIONS.has(ext) && !DOCUMENT_EXTENSIONS.has(ext)) {
    return c.json({ error: 'Unsupported file type.' }, 400)
  }
  if (!file.size || file.size > MAX_UPLOAD_BYTES) {
    return c.json({ error: 'File too large. Maximum size is 10MB.' }, 400)
  }

  const fileBuffer = await file.arrayBuffer()
  const storageConfig = getStorageConfig(c.env)
  const storageClient = storageConfig ? getStorageClient(c.env, storageConfig.region) : null

  let storageMode = 'legacy'
  let storageKey = buildLegacyDataUrl(file, fileBuffer)
  let storageWarning = LEGACY_STORAGE_WARNING

  if (storageConfig && storageClient) {
    storageMode = 'aws'
    storageWarning = null
    storageKey = buildObjectKey(profile, clientId, file.name, storageConfig.prefix)

    const uploadRes = await storageClient.fetch(
      buildS3Url(storageConfig.bucket, storageConfig.region, storageKey),
      {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || inferContentType(file.name),
        },
        body: fileBuffer,
      },
    )

    if (!uploadRes.ok) {
      return c.json({ error: `Managed upload failed: ${await readAwsError(uploadRes)}` }, 502)
    }
  }

  try {
    const insertResult = await query(c.env,
      `INSERT INTO client_files (
        client_id, org_id, uploaded_by, filename, file_type, file_size, storage_key, category, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        clientId,
        profile.org_id,
        profile.id,
        file.name,
        getFileType(file.name),
        file.size,
        storageKey,
        category,
        notes || '',
      ],
    )

    return c.json({
      data: insertResult.rows[0],
      storage_mode: storageMode,
      storage_warning: storageWarning,
    }, 201)
  } catch (err) {
    if (storageMode === 'aws') {
      try {
        await removeManagedObject(c.env, storageKey)
      } catch (cleanupErr) {
        console.error('Failed to clean up managed file after DB error:', cleanupErr.message)
      }
    }
    throw err
  }
})

app.get('/:id/content', async (c) => {
  const profile = c.get('profile')
  const fileId = c.req.param('id')
  const asAttachment = c.req.query('download') === '1'

  const file = await getClientFile(c.env, fileId)
  if (!file) return c.json({ error: 'File not found.' }, 404)
  if (!await canAccessClient(c.env, profile, file.client_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  if (!file.storage_key) return c.json({ error: 'File has no stored content.' }, 404)

  if (file.storage_key.startsWith('data:')) {
    const legacy = decodeLegacyDataUrl(file.storage_key)
    if (!legacy) return c.json({ error: 'Legacy file content is invalid.' }, 500)

    return new Response(legacy.body, {
      headers: {
        'Content-Type': legacy.contentType,
        'Content-Disposition': buildContentDisposition(file.filename, asAttachment),
        'Cache-Control': 'private, max-age=60',
      },
    })
  }

  const storageConfig = getStorageConfig(c.env)
  const storageClient = storageConfig ? getStorageClient(c.env, storageConfig.region) : null
  if (!storageConfig || !storageClient) {
    return c.json({ error: 'AWS document storage is not configured for this file.' }, 503)
  }

  const downloadRes = await storageClient.fetch(
    buildS3Url(storageConfig.bucket, storageConfig.region, file.storage_key),
    { method: 'GET' },
  )

  if (!downloadRes.ok) {
    return c.json({ error: `Failed to fetch file content: ${await readAwsError(downloadRes)}` }, 502)
  }

  const headers = new Headers()
  headers.set('Content-Type', downloadRes.headers.get('content-type') || inferContentType(file.filename))
  headers.set('Content-Disposition', buildContentDisposition(file.filename, asAttachment))
  headers.set('Cache-Control', 'private, max-age=60')

  const contentLength = downloadRes.headers.get('content-length')
  if (contentLength) headers.set('Content-Length', contentLength)

  return new Response(downloadRes.body, {
    status: 200,
    headers,
  })
})

app.delete('/:id', async (c) => {
  const profile = c.get('profile')
  const fileId = c.req.param('id')

  if (!hasClinicalManagerRole(profile)) {
    return c.json({ error: 'Only BCBA and admin roles can delete files.' }, 403)
  }

  const file = await getClientFile(c.env, fileId)
  if (!file) return c.json({ error: 'File not found.' }, 404)
  if (!await canAccessClient(c.env, profile, file.client_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  if (file.storage_key && !file.storage_key.startsWith('data:')) {
    try {
      await removeManagedObject(c.env, file.storage_key)
    } catch (err) {
      return c.json({ error: err.message }, 502)
    }
  }

  await query(c.env, 'DELETE FROM client_files WHERE id = $1', [fileId])
  return c.json({ success: true })
})

export default app
