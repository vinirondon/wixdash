// api/auth/register.js
const bcrypt = require('bcryptjs')
const { prisma } = require('../../lib/prisma')
const { signToken } = require('../../lib/jwt')
const { setCors } = require('../../middleware/auth')

module.exports = async function handler(req, res) {
  setCors(res)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, password, name } = req.body || {}

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' })
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Senha deve ter no mínimo 8 caracteres' })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return res.status(409).json({ error: 'Email já cadastrado' })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: { email, passwordHash, name: name || email.split('@')[0] },
  })

  const token = await signToken({ userId: user.id, email: user.email })

  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
  })
}
