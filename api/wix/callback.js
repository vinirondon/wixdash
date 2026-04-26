// api/wix/callback.js
// Passo 2 do OAuth: Wix redireciona aqui com ?code=xxx&state=yyy
// Troca o code por access_token e salva no banco
const { prisma } = require('../../lib/prisma')

module.exports = async function handler(req, res) {
  const { code, state, error } = req.query

  if (error) {
    return res.redirect(`${process.env.FRONTEND_URL}/dashboard?wix_error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return res.status(400).send('Parâmetros inválidos')
  }

  // Recupera userId do state
  let userId
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    userId = decoded.userId
  } catch {
    return res.status(400).send('State inválido')
  }

  // Troca code por tokens
  const tokenRes = await fetch('https://www.wix.com/oauth/access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type:    'authorization_code',
      client_id:     process.env.WIX_CLIENT_ID,
      client_secret: process.env.WIX_CLIENT_SECRET,
      redirect_uri:  process.env.WIX_REDIRECT_URI,
      code,
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    console.error('Token exchange failed:', err)
    return res.redirect(`${process.env.FRONTEND_URL}/dashboard?wix_error=token_exchange_failed`)
  }

  const tokens = await tokenRes.json()
  // tokens = { access_token, refresh_token, expires_in, token_type }

  // Busca informações do site para salvar o siteId
  let siteId = '', siteName = '', siteUrl = ''
  try {
    const siteRes = await fetch('https://www.wixapis.com/site-properties/v4/properties', {
      headers: {
        'Authorization': tokens.access_token,
        'Content-Type': 'application/json',
      },
    })
    if (siteRes.ok) {
      const siteData = await siteRes.json()
      siteId   = siteData.properties?.id || tokens.app_instance_id || ''
      siteName = siteData.properties?.siteDisplayName || ''
      siteUrl  = siteData.properties?.url || ''
    }
  } catch (e) {
    console.error('Could not fetch site info:', e.message)
    siteId = tokens.app_instance_id || `wix_${userId}_${Date.now()}`
  }

  // Upsert: se já existe uma conexão para este site, atualiza; senão cria
  await prisma.wixConnection.upsert({
    where: {
      // PlanetScale não tem unique composta facilmente, usamos id sintético
      id: `${userId}_${siteId}`.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 30),
    },
    update: {
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt:    new Date(Date.now() + (tokens.expires_in || 3600) * 1000),
      siteName,
      siteUrl,
      syncStatus:   'idle',
      syncError:    null,
    },
    create: {
      id:           `${userId}_${siteId}`.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 30),
      userId,
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt:    new Date(Date.now() + (tokens.expires_in || 3600) * 1000),
      siteId,
      siteName,
      siteUrl,
    },
  })

  // Redireciona para o dashboard e dispara o primeiro sync
  res.redirect(`${process.env.FRONTEND_URL}/dashboard?wix_connected=1`)
}
