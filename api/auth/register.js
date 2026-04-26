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
    const { email, password, name } = req.body || {}
    if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' })
    if (password.length < 8) return res.status(400).json({ error: 'Senha deve ter no mínimo 8 caracteres' })

    const sql = getDb()
    const existing = await sql`SELECT id FROM "User" WHERE email = ${email} LIMIT 1`
    if (existing[0]) return res.status(409).json({ error: 'Email já cadastrado' })

    const passwordHash = await bcrypt.hash(password, 12)
    const id = require('crypto').randomBytes(12).toString('hex')
    const displayName = name || email.split('@')[0]

    await sql`INSERT INTO "User" (id, email, "passwordHash", name, plan, "createdAt", "updatedAt") VALUES (${id}, ${email}, ${passwordHash}, ${displayName}, 'free', NOW(), NOW())`

    const token = await signToken({ userId: id, email })
    res.status(201).json({ token, user: { id, email, name: displayName, plan: 'free' } })
  } catch (e) {
    console.error('register error:', e.message)
    res.status(500).json({ error: e.message })
  }
}
