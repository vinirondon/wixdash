require('dotenv').config()
const { verifyToken } = require('../lib/jwt')
const { getDb } = require('../lib/db')

async function requireAuth(req, res) {
  const header = req.headers.authorization || ''
  const token = header.replace('Bearer ', '').trim()
  if (!token) { res.status(401).json({ error: 'Token ausente' }); return null }

  const payload = await verifyToken(token)
  if (!payload) { res.status(401).json({ error: 'Token inválido' }); return null }

  const sql = getDb()
  const rows = await sql`SELECT id, email, name, plan FROM "User" WHERE id = ${payload.userId} LIMIT 1`
  if (!rows[0]) { res.status(401).json({ error: 'Usuário não encontrado' }); return null }
  return rows[0]
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

module.exports = { requireAuth, setCors }
