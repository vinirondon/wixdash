// api/wix/disconnect.js
const { prisma } = require('../../lib/prisma')
const { requireAuth, setCors } = require('../../middleware/auth')

module.exports = async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })

  const user = await requireAuth(req, res)
  if (!user) return

  // Apaga a conexão e todos os dados sincronizados (cascade)
  await prisma.wixConnection.deleteMany({
    where: { userId: user.id },
  })

  res.status(200).json({ ok: true, message: 'Wix desconectado e dados removidos' })
}
