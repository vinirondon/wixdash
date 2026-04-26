// middleware/auth.js
const { verifyToken } = require('../lib/jwt')
const { prisma } = require('../lib/prisma')

// Uso: const user = await requireAuth(req, res)
// Se retornar null, a resposta já foi enviada (401)
async function requireAuth(req, res) {
  const header = req.headers.authorization || ''
  const token  = header.replace('Bearer ', '').trim()

  if (!token) {
    res.status(401).json({ error: 'Token ausente' })
    return null
  }

  const payload = await verifyToken(token)

  if (!payload) {
    res.status(401).json({ error: 'Token inválido ou expirado' })
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  })

  if (!user) {
    res.status(401).json({ error: 'Usuário não encontrado' })
    return null
  }

  return user
}

// Helper para setar headers CORS em todas as rotas
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

module.exports = { requireAuth, setCors }
