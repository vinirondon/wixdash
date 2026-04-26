// api/wix/connect.js
// Passo 1 do OAuth: gera a URL de autorização do Wix e redireciona o usuário
const { requireAuth, setCors } = require('../../middleware/auth')

module.exports = async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const user = await requireAuth(req, res)
  if (!user) return

  // state = userId codificado em base64, para recuperar no callback
  const state = Buffer.from(JSON.stringify({ userId: user.id })).toString('base64url')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     process.env.WIX_CLIENT_ID,
    redirect_uri:  process.env.WIX_REDIRECT_URI,
    scope:         [
      'WIX_BOOKINGS.READ_BOOKINGS',
      'WIX_BOOKINGS.READ_SERVICES',
      'WIX_BOOKINGS.READ_STAFF',
      'WIX_CRM.READ_CONTACTS',
      'WIX_ECOMMERCE.READ_ORDERS',
      'SITE_PROPERTIES.READ',
    ].join(' '),
    state,
  })

  const authUrl = `https://www.wix.com/oauth/authorize?${params}`

  res.status(200).json({ authUrl })
}
