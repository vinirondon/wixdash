require('dotenv').config()
const { getDb } = require('../../lib/db')
const crypto = require('crypto')

module.exports = async function handler(req, res) {
  const { code, state, error } = req.query
  if (error) return res.redirect(`${process.env.FRONTEND_URL}/dashboard.html?wix_error=${encodeURIComponent(error)}`)
  if (!code || !state) return res.status(400).send('Parâmetros inválidos')

  let userId
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString())
    userId = decoded.userId
  } catch { return res.status(400).send('State inválido') }

  const tokenRes = await fetch('https://www.wix.com/oauth/access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'authorization_code', client_id: process.env.WIX_CLIENT_ID, client_secret: process.env.WIX_CLIENT_SECRET, redirect_uri: process.env.WIX_REDIRECT_URI, code }),
  })

  if (!tokenRes.ok) return res.redirect(`${process.env.FRONTEND_URL}/dashboard.html?wix_error=token_exchange_failed`)

  const tokens = await tokenRes.json()
  let siteId = tokens.app_instance_id || crypto.randomBytes(8).toString('hex')
  let siteName = '', siteUrl = ''

  try {
    const siteRes = await fetch('https://www.wixapis.com/site-properties/v4/properties', { headers: { 'Authorization': tokens.access_token } })
    if (siteRes.ok) {
      const d = await siteRes.json()
      siteId = d.properties?.id || siteId
      siteName = d.properties?.siteDisplayName || ''
      siteUrl = d.properties?.url || ''
    }
  } catch(e) { console.error('site info error:', e.message) }

  const sql = getDb()
  const connId = `${userId}_${siteId}`.replace(/[^a-zA-Z0-9]/g,'_').substring(0,30)
  const expiresAt = new Date(Date.now() + (tokens.expires_in||3600)*1000).toISOString()

  await sql`INSERT INTO "WixConnection" (id, "userId", "accessToken", "refreshToken", "expiresAt", "siteId", "siteName", "siteUrl", "syncStatus", "createdAt", "updatedAt")
    VALUES (${connId}, ${userId}, ${tokens.access_token}, ${tokens.refresh_token||''}, ${expiresAt}, ${siteId}, ${siteName}, ${siteUrl}, 'idle', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET "accessToken"=EXCLUDED."accessToken", "refreshToken"=EXCLUDED."refreshToken", "expiresAt"=EXCLUDED."expiresAt", "updatedAt"=NOW()`

  res.redirect(`${process.env.FRONTEND_URL}/dashboard.html?wix_connected=1`)
}
