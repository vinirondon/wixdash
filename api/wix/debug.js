// api/wix/debug.js — só para descobrir qual endpoint de staff funciona
require('dotenv').config()
const { requireAuth, setCors } = require('../../middleware/auth')
const { getDb } = require('../../lib/db')

module.exports = async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const user = await requireAuth(req, res)
  if (!user) return

  const sql = getDb()
  const connRows = await sql`SELECT * FROM "WixConnection" WHERE "userId" = ${user.id} LIMIT 1`
  const conn = connRows[0]
  if (!conn) return res.status(400).json({ error: 'Sem conexão' })

  const headers = {
    'Authorization': conn.accessToken,
    'wix-site-id': conn.siteId,
    'Content-Type': 'application/json',
  }

  const tests = [
    { name: 'v2 staff-members', url: 'https://www.wixapis.com/bookings/v2/staff-members/query', method: 'POST', body: { query: { paging: { limit: 10 } } } },
    { name: 'v1 resources STAFF', url: 'https://www.wixapis.com/bookings/v1/resources/query', method: 'POST', body: { query: { paging: { limit: 10 } }, resourceTypes: ['STAFF_MEMBER'] } },
    { name: 'v1 staff GET', url: 'https://www.wixapis.com/bookings/v1/staff', method: 'GET', body: null },
    { name: 'calendar resources', url: 'https://www.wixapis.com/calendar/v1/resources/query', method: 'POST', body: { query: { paging: { limit: 10 } } } },
  ]

  const results = []
  for (const t of tests) {
    try {
      const r = await fetch(t.url, {
        method: t.method,
        headers,
        body: t.body ? JSON.stringify(t.body) : undefined,
      })
      const text = await r.text()
      let parsed
      try { parsed = JSON.parse(text) } catch { parsed = text }
      results.push({ name: t.name, status: r.status, data: parsed })
    } catch(e) {
      results.push({ name: t.name, status: 'error', data: e.message })
    }
  }

  res.status(200).json(results)
}
