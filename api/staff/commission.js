// api/staff/commission.js
const { prisma } = require('../../lib/prisma')
const { requireAuth, setCors } = require('../../middleware/auth')

module.exports = async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' })

  const user = await requireAuth(req, res)
  if (!user) return

  const { staffId, commission } = req.body || {}

  if (!staffId || commission === undefined) {
    return res.status(400).json({ error: 'staffId e commission são obrigatórios' })
  }

  const pct = parseFloat(commission)
  if (isNaN(pct) || pct < 0 || pct > 100) {
    return res.status(400).json({ error: 'Commission deve ser entre 0 e 100' })
  }

  // Verifica que o staff pertence ao usuário
  const staff = await prisma.staff.findFirst({
    where: {
      id: staffId,
      connection: { userId: user.id },
    },
  })

  if (!staff) {
    return res.status(404).json({ error: 'Staff não encontrado' })
  }

  const updated = await prisma.staff.update({
    where: { id: staffId },
    data:  { commission: pct },
  })

  res.status(200).json({ ok: true, staff: updated })
}
