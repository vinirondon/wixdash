require('dotenv').config()
const { requireAuth, setCors } = require('../../middleware/auth')
const { getDb } = require('../../lib/db')

module.exports = async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })
  const user = await requireAuth(req, res)
  if (!user) return
  const sql = getDb()
  await sql`DELETE FROM "WixConnection" WHERE "userId" = ${user.id}`
  res.status(200).json({ ok: true })
}
