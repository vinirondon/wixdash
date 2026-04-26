require('dotenv').config()
const { requireAuth, setCors } = require('../../middleware/auth')
const { getDb } = require('../../lib/db')

module.exports = async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user = await requireAuth(req, res)
    if (!user) return

    const sql = getDb()
    const connRows = await sql`SELECT * FROM "WixConnection" WHERE "userId" = ${user.id} ORDER BY "createdAt" DESC LIMIT 1`
    const connection = connRows[0]

    if (!connection) return res.status(200).json({ connected: false })

    const { section = 'dashboard', search = '', status = '' } = req.query
    const cid = connection.id

    if (section === 'dashboard') {
      const [bookingCount, clientCount, todayCount, recentBookings, topServices, revenue] = await Promise.all([
        sql`SELECT COUNT(*) as count FROM "Booking" WHERE "connectionId" = ${cid}`,
        sql`SELECT COUNT(*) as count FROM "Client" WHERE "connectionId" = ${cid}`,
        sql`SELECT COUNT(*) as count FROM "Booking" WHERE "connectionId" = ${cid} AND "startTime"::date = CURRENT_DATE`,
        sql`SELECT * FROM "Booking" WHERE "connectionId" = ${cid} ORDER BY "startTime" DESC LIMIT 10`,
        sql`SELECT "serviceName", COUNT(*) as cnt, SUM(price) as rev FROM "Booking" WHERE "connectionId" = ${cid} AND "serviceName" IS NOT NULL GROUP BY "serviceName" ORDER BY cnt DESC LIMIT 5`,
        sql`SELECT SUM(total) as total FROM "Order" WHERE "connectionId" = ${cid}`,
      ])

      return res.status(200).json({
        connected: true,
        connection: { siteId: connection.siteId, siteName: connection.siteName, siteUrl: connection.siteUrl, lastSyncAt: connection.lastSyncAt, syncStatus: connection.syncStatus },
        kpis: { totalRevenue: revenue[0]?.total || 0, bookings: parseInt(bookingCount[0].count), clients: parseInt(clientCount[0].count), todayBookings: parseInt(todayCount[0].count) },
        recentBookings,
        topServices: topServices.map(s => ({ serviceName: s.serviceName, _count: { serviceName: parseInt(s.cnt) }, _sum: { price: s.rev } })),
      })
    }

    if (section === 'bookings') {
      const where = search
        ? sql`AND ("clientName" ILIKE ${'%'+search+'%'} OR "serviceName" ILIKE ${'%'+search+'%'})`
        : sql``
      const statusFilter = status ? sql`AND status = ${status}` : sql``
      const items = await sql`SELECT * FROM "Booking" WHERE "connectionId" = ${cid} ${where} ${statusFilter} ORDER BY "startTime" DESC LIMIT 50`
      const total = await sql`SELECT COUNT(*) as count FROM "Booking" WHERE "connectionId" = ${cid}`
      return res.status(200).json({ items, total: parseInt(total[0].count) })
    }

    if (section === 'clients') {
      const where = search ? sql`AND (name ILIKE ${'%'+search+'%'} OR email ILIKE ${'%'+search+'%'})` : sql``
      const items = await sql`SELECT * FROM "Client" WHERE "connectionId" = ${cid} ${where} ORDER BY "createdAt" DESC LIMIT 50`
      const total = await sql`SELECT COUNT(*) as count FROM "Client" WHERE "connectionId" = ${cid}`
      return res.status(200).json({ items, total: parseInt(total[0].count) })
    }

    if (section === 'services') {
      const items = await sql`SELECT * FROM "Service" WHERE "connectionId" = ${cid} ORDER BY name ASC`
      return res.status(200).json({ items })
    }

    if (section === 'orders') {
      const where = search ? sql`AND ("clientName" ILIKE ${'%'+search+'%'})` : sql``
      const statusFilter = status ? sql`AND "paymentStatus" = ${status}` : sql``
      const items = await sql`SELECT * FROM "Order" WHERE "connectionId" = ${cid} ${where} ${statusFilter} ORDER BY "createdDate" DESC LIMIT 50`
      const total = await sql`SELECT COUNT(*) as count FROM "Order" WHERE "connectionId" = ${cid}`
      return res.status(200).json({ items, total: parseInt(total[0].count) })
    }

    if (section === 'staff') {
      const staffList = await sql`SELECT * FROM "Staff" WHERE "connectionId" = ${cid} ORDER BY name ASC`
      const enriched = await Promise.all(staffList.map(async s => {
        const agg = await sql`SELECT COUNT(*) as cnt, SUM(price) as rev FROM "Booking" WHERE "connectionId" = ${cid} AND "staffName" ILIKE ${'%'+(s.name||'')+'%'}`
        return { ...s, bookingCount: parseInt(agg[0].cnt||0), revenue: parseFloat(agg[0].rev||0) }
      }))
      return res.status(200).json({ items: enriched })
    }

    if (section === 'payroll') {
      const staffList = await sql`SELECT * FROM "Staff" WHERE "connectionId" = ${cid} ORDER BY name ASC`
      const enriched = await Promise.all(staffList.map(async s => {
        const agg = await sql`SELECT COUNT(*) as cnt, SUM(price) as rev FROM "Booking" WHERE "connectionId" = ${cid} AND "staffName" ILIKE ${'%'+(s.name||'')+'%'} AND status != 'CANCELED'`
        const revenue = parseFloat(agg[0].rev||0)
        const earnings = revenue * (s.commission||30) / 100
        return { ...s, bookingCount: parseInt(agg[0].cnt||0), revenue, earnings: Math.round(earnings*100)/100 }
      }))
      const totalPayroll = enriched.reduce((a,s) => a + s.earnings, 0)
      return res.status(200).json({ items: enriched, totalPayroll })
    }

    res.status(400).json({ error: 'Section inválida' })
  } catch (e) {
    console.error('data error:', e.message)
    res.status(500).json({ error: e.message })
  }
}
