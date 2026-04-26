// api/auth/login.js
const bcrypt = require('bcryptjs')
const { prisma } = require('../../lib/prisma')
const { signToken } = require('../../lib/jwt')
const { setCors } = require('../../middleware/auth')

module.exports = async function handler(req, res) {
  setCors(res)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, password } = req.body || {}

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' })
  }

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Credenciais inválidas' })
  }

  const token = await signToken({ userId: user.id, email: user.email })

  // Retorna também a conexão Wix ativa, se houver
  const wixConnection = await prisma.wixConnection.findFirst({
    where: { userId: user.id },
    select: { id: true, siteId: true, siteName: true, siteUrl: true, lastSyncAt: true, syncStatus: true },
    orderBy: { createdAt: 'desc' },
  })

  res.status(200).json({
    token,
    user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
    wixConnection,
  })
}
