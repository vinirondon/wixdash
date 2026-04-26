require('dotenv').config()
const bcrypt = require('bcryptjs')
const { getDb } = require('../../lib/db')
const { signToken } = require('../../lib/jwt')
const { setCors } = require('../../middleware/auth')

module.exports = async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' })

    const sql = getDb()
    const rows = await sql`SELECT id, email, "passwordHash", name, plan FROM "User" WHERE email = ${email} LIMIT 1`
    const user = rows[0]

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    const token = await signToken({ userId: user.id, email: user.email })
    const conn = await sql`SELECT id, "siteId", "siteName", "siteUrl", "lastSyncAt", "syncStatus" FROM "WixConnection" WHERE "userId" = ${user.id} ORDER BY "createdAt" DESC LIMIT 1`

    res.status(200).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
      wixConnection: conn[0] || null,
    })
  } catch (e) {
    console.error('login error:', e.message)
    res.status(500).json({ error: e.message })
  }
}
