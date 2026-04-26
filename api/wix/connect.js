require('dotenv').config()
const { requireAuth, setCors } = require('../../middleware/auth')

module.exports = async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  const user = await requireAuth(req, res)
  if (!user) return

  const state = Buffer.from(JSON.stringify({ userId: user.id })).toString('base64')
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.WIX_CLIENT_ID,
    redirect_uri: process.env.WIX_REDIRECT_URI,
    scope: 'WIX_BOOKINGS.READ_BOOKINGS WIX_BOOKINGS.READ_SERVICES WIX_CRM.READ_CONTACTS WIX_ECOMMERCE.READ_ORDERS SITE_PROPERTIES.READ',
    state,
  })
  res.status(200).json({ authUrl: `https://www.wix.com/oauth/authorize?${params}` })
}
