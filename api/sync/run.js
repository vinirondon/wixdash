require('dotenv').config()
const { requireAuth, setCors } = require('../../middleware/auth')
const { getDb } = require('../../lib/db')
const wixClient = require('../../lib/wix')

module.exports = async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user = await requireAuth(req, res)
    if (!user) return

    const sql = getDb()
    const connRows = await sql`SELECT * FROM "WixConnection" WHERE "userId" = ${user.id} ORDER BY "createdAt" DESC LIMIT 1`
    const connection = connRows[0]
    if (!connection) return res.status(400).json({ error: 'Nenhuma conexão Wix encontrada' })
    if (connection.syncStatus === 'syncing') return res.status(409).json({ error: 'Sync em andamento' })

    await sql`UPDATE "WixConnection" SET "syncStatus" = 'syncing', "updatedAt" = NOW() WHERE id = ${connection.id}`

    const results = { bookings: 0, clients: 0, services: 0, orders: 0, staff: 0, errors: [] }

    try {
      const bookings = await wixClient.fetchBookings(connection)
      for (const b of bookings) {
        const wixId = b.id
        const clientName = (b.contactDetails?.firstName||'') + ' ' + (b.contactDetails?.lastName||'')
        await sql`INSERT INTO "Booking" (id, "connectionId", "wixId", "clientName", "clientEmail", "serviceName", "staffName", "startTime", "endTime", status, price, currency, "rawPayload", "createdAt", "updatedAt")
          VALUES (${require('crypto').randomBytes(12).toString('hex')}, ${connection.id}, ${wixId}, ${clientName.trim()}, ${b.contactDetails?.email||null}, ${b.bookedEntity?.title||null}, ${b.bookedEntity?.staffMemberDetails?.name||null}, ${b.startDate||null}, ${b.endDate||null}, ${b.status||null}, ${b.paymentAmount?.amount||null}, 'USD', ${JSON.stringify(b)}, NOW(), NOW())
          ON CONFLICT ("connectionId", "wixId") DO UPDATE SET "clientName"=EXCLUDED."clientName", "serviceName"=EXCLUDED."serviceName", status=EXCLUDED.status, "updatedAt"=NOW()`
        results.bookings++
      }
    } catch(e) { results.errors.push('bookings: '+e.message) }

    try {
      const contacts = await wixClient.fetchContacts(connection)
      for (const c of contacts) {
        const name = [c.info?.name?.first, c.info?.name?.last].filter(Boolean).join(' ')
        await sql`INSERT INTO "Client" (id, "connectionId", "wixId", name, email, phone, "createdAt", "updatedAt")
          VALUES (${require('crypto').randomBytes(12).toString('hex')}, ${connection.id}, ${c.id}, ${name||null}, ${c.primaryInfo?.email||null}, ${c.primaryInfo?.phone||null}, NOW(), NOW())
          ON CONFLICT ("connectionId", "wixId") DO UPDATE SET name=EXCLUDED.name, email=EXCLUDED.email, "updatedAt"=NOW()`
        results.clients++
      }
    } catch(e) { results.errors.push('contacts: '+e.message) }

    try {
      const services = await wixClient.fetchServices(connection)
      for (const s of services) {
        await sql`INSERT INTO "Service" (id, "connectionId", "wixId", name, category, "durationMins", price, currency, status, "createdAt", "updatedAt")
          VALUES (${require('crypto').randomBytes(12).toString('hex')}, ${connection.id}, ${s.id}, ${s.name||null}, ${s.category?.name||null}, ${s.defaultDuration||null}, ${s.payment?.fixed?.price?.amount||null}, 'USD', ${s.status||null}, NOW(), NOW())
          ON CONFLICT ("connectionId", "wixId") DO UPDATE SET name=EXCLUDED.name, price=EXCLUDED.price, "updatedAt"=NOW()`
        results.services++
      }
    } catch(e) { results.errors.push('services: '+e.message) }

    try {
      const orders = await wixClient.fetchOrders(connection)
      for (const o of orders) {
        const clientName = (o.billingInfo?.contactDetails?.firstName||'') + ' ' + (o.billingInfo?.contactDetails?.lastName||'')
        await sql`INSERT INTO "Order" (id, "connectionId", "wixId", "clientName", "clientEmail", total, currency, status, "paymentStatus", "createdDate", "createdAt", "updatedAt")
          VALUES (${require('crypto').randomBytes(12).toString('hex')}, ${connection.id}, ${o.id}, ${clientName.trim()}, ${o.billingInfo?.contactDetails?.email||null}, ${o.priceSummary?.total?.amount||null}, 'USD', ${o.fulfillmentStatus||null}, ${o.paymentStatus||null}, ${o.createdDate||null}, NOW(), NOW())
          ON CONFLICT ("connectionId", "wixId") DO UPDATE SET status=EXCLUDED.status, "paymentStatus"=EXCLUDED."paymentStatus", "updatedAt"=NOW()`
        results.orders++
      }
    } catch(e) { results.errors.push('orders: '+e.message) }

    try {
      const staffList = await wixClient.fetchStaff(connection)
      for (const s of staffList) {
        await sql`INSERT INTO "Staff" (id, "connectionId", "wixId", name, email, role, commission, "createdAt", "updatedAt")
          VALUES (${require('crypto').randomBytes(12).toString('hex')}, ${connection.id}, ${s.id}, ${s.name||null}, ${s.email||null}, ${s.roleType||null}, 30, NOW(), NOW())
          ON CONFLICT ("connectionId", "wixId") DO UPDATE SET name=EXCLUDED.name, "updatedAt"=NOW()`
        results.staff++
      }
    } catch(e) { results.errors.push('staff: '+e.message) }

    await sql`UPDATE "WixConnection" SET "syncStatus" = ${results.errors.length ? 'partial' : 'idle'}, "syncError" = ${results.errors.join(' | ')||null}, "lastSyncAt" = NOW(), "updatedAt" = NOW() WHERE id = ${connection.id}`

    res.status(200).json({ ok: true, results })
  } catch (e) {
    console.error('sync error:', e.message)
    res.status(500).json({ error: e.message })
  }
}
