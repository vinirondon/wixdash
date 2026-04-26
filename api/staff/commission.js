require('dotenv').config()
const { requireAuth, setCors } = require('../../middleware/auth')
const { getDb } = require('../../lib/db')

module.exports = async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' })
  const user = await requireAuth(req, res)
  if (!user) return
  const { staffId, commission } = req.body || {}
  if (!staffId || commission === undefined) return res.status(400).json({ error: 'staffId e commission obrigatórios' })
  const pct = parseFloat(commission)
  if (isNaN(pct) || pct < 0 || pct > 100) return res.status(400).json({ error: 'Commission deve ser 0-100' })
  const sql = getDb()
  await sql`UPDATE "Staff" SET commission = ${pct}, "updatedAt" = NOW() WHERE id = ${staffId}`
  res.status(200).json({ ok: true })
}
