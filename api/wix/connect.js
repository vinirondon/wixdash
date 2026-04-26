// api/wix/connect.js
// Conexão via API Key — o cliente cola a chave do painel Wix
require('dotenv').config()
const { requireAuth, setCors } = require('../../middleware/auth')
const { getDb } = require('../../lib/db')
const crypto = require('crypto')

module.exports = async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user = await requireAuth(req, res)
    if (!user) return

    const { apiKey, siteId } = req.body || {}

    if (!apiKey || !siteId) {
      return res.status(400).json({ error: 'API Key e Site ID são obrigatórios' })
    }

    // Valida a chave tentando buscar info do site
    const testRes = await fetch(`https://www.wixapis.com/site-properties/v4/properties`, {
      headers: {
        'Authorization': apiKey,
        'wix-site-id': siteId,
        'Content-Type': 'application/json',
      }
    })

    if (!testRes.ok) {
      return res.status(401).json({ error: 'API Key ou Site ID inválidos. Verifique e tente novamente.' })
    }

    const siteData = await testRes.json()
    const siteName = siteData.properties?.siteDisplayName || siteData.properties?.businessName || 'Meu Site Wix'
    const siteUrl  = siteData.properties?.url || ''

    const sql = getDb()
    const connId = `conn_${user.id}_${siteId}`.replace(/[^a-zA-Z0-9]/g,'_').substring(0,40)

    await sql`
      INSERT INTO "WixConnection" 
        (id, "userId", "accessToken", "refreshToken", "expiresAt", "siteId", "siteName", "siteUrl", "syncStatus", "createdAt", "updatedAt")
      VALUES 
        (${connId}, ${user.id}, ${apiKey}, '', '2099-01-01', ${siteId}, ${siteName}, ${siteUrl}, 'idle', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET 
        "accessToken" = EXCLUDED."accessToken",
        "siteName"    = EXCLUDED."siteName",
        "siteUrl"     = EXCLUDED."siteUrl",
        "updatedAt"   = NOW()
    `

    res.status(200).json({
      ok: true,
      connection: { id: connId, siteId, siteName, siteUrl }
    })
  } catch (e) {
    console.error('connect error:', e.message)
    res.status(500).json({ error: e.message })
  }
}
