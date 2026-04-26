// api/sync/run.js
// Ingere todos os dados do Wix para a conexão do usuário logado.
// Roda de forma idempotente: upsert em todos os registros.
const { prisma } = require('../../lib/prisma')
const { requireAuth, setCors } = require('../../middleware/auth')
const wixClient = require('../../lib/wix')

module.exports = async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await requireAuth(req, res)
  if (!user) return

  // Busca a conexão ativa do usuário
  const connection = await prisma.wixConnection.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  if (!connection) {
    return res.status(400).json({ error: 'Nenhuma conexão Wix encontrada. Conecte seu site primeiro.' })
  }

  // Evita sync simultâneo
  if (connection.syncStatus === 'syncing') {
    return res.status(409).json({ error: 'Sync já em andamento' })
  }

  // Marca como syncing
  await prisma.wixConnection.update({
    where: { id: connection.id },
    data: { syncStatus: 'syncing', syncError: null },
  })

  const results = { bookings: 0, clients: 0, services: 0, orders: 0, staff: 0, errors: [] }

  try {
    // ── Bookings ────────────────────────────────────
    try {
      const bookings = await wixClient.fetchBookings(connection)
      for (const b of bookings) {
        await prisma.booking.upsert({
          where: { connectionId_wixId: { connectionId: connection.id, wixId: b.id } },
          update: {
            clientName:  b.contactDetails?.firstName + ' ' + (b.contactDetails?.lastName || ''),
            clientEmail: b.contactDetails?.email || null,
            serviceName: b.bookedEntity?.title || null,
            staffName:   b.bookedEntity?.staffMemberDetails?.name || null,
            startTime:   b.startDate ? new Date(b.startDate) : null,
            endTime:     b.endDate   ? new Date(b.endDate)   : null,
            status:      b.status || null,
            price:       b.paymentAmount?.amount ? parseFloat(b.paymentAmount.amount) : null,
            currency:    b.paymentAmount?.currency || 'USD',
            rawPayload:  b,
          },
          create: {
            connectionId: connection.id,
            wixId:        b.id,
            clientName:   b.contactDetails?.firstName + ' ' + (b.contactDetails?.lastName || ''),
            clientEmail:  b.contactDetails?.email || null,
            serviceName:  b.bookedEntity?.title || null,
            staffName:    b.bookedEntity?.staffMemberDetails?.name || null,
            startTime:    b.startDate ? new Date(b.startDate) : null,
            endTime:      b.endDate   ? new Date(b.endDate)   : null,
            status:       b.status || null,
            price:        b.paymentAmount?.amount ? parseFloat(b.paymentAmount.amount) : null,
            currency:     b.paymentAmount?.currency || 'USD',
            rawPayload:   b,
          },
        })
        results.bookings++
      }
    } catch (e) {
      results.errors.push(`bookings: ${e.message}`)
    }

    // ── Contacts ────────────────────────────────────
    try {
      const contacts = await wixClient.fetchContacts(connection)
      for (const c of contacts) {
        await prisma.client.upsert({
          where: { connectionId_wixId: { connectionId: connection.id, wixId: c.id } },
          update: {
            name:       [c.info?.name?.first, c.info?.name?.last].filter(Boolean).join(' ') || null,
            email:      c.primaryInfo?.email || null,
            phone:      c.primaryInfo?.phone || null,
            rawPayload: c,
          },
          create: {
            connectionId: connection.id,
            wixId:        c.id,
            name:         [c.info?.name?.first, c.info?.name?.last].filter(Boolean).join(' ') || null,
            email:        c.primaryInfo?.email || null,
            phone:        c.primaryInfo?.phone || null,
            rawPayload:   c,
          },
        })
        results.clients++
      }
    } catch (e) {
      results.errors.push(`contacts: ${e.message}`)
    }

    // ── Services ────────────────────────────────────
    try {
      const services = await wixClient.fetchServices(connection)
      for (const s of services) {
        await prisma.service.upsert({
          where: { connectionId_wixId: { connectionId: connection.id, wixId: s.id } },
          update: {
            name:         s.name || null,
            category:     s.category?.name || null,
            durationMins: s.defaultDuration || null,
            price:        s.payment?.fixed?.price?.amount ? parseFloat(s.payment.fixed.price.amount) : null,
            currency:     s.payment?.fixed?.price?.currency || 'USD',
            status:       s.status || null,
            rawPayload:   s,
          },
          create: {
            connectionId: connection.id,
            wixId:        s.id,
            name:         s.name || null,
            category:     s.category?.name || null,
            durationMins: s.defaultDuration || null,
            price:        s.payment?.fixed?.price?.amount ? parseFloat(s.payment.fixed.price.amount) : null,
            currency:     s.payment?.fixed?.price?.currency || 'USD',
            status:       s.status || null,
            rawPayload:   s,
          },
        })
        results.services++
      }
    } catch (e) {
      results.errors.push(`services: ${e.message}`)
    }

    // ── Orders ──────────────────────────────────────
    try {
      const orders = await wixClient.fetchOrders(connection)
      for (const o of orders) {
        await prisma.order.upsert({
          where: { connectionId_wixId: { connectionId: connection.id, wixId: o.id } },
          update: {
            clientName:    o.billingInfo?.contactDetails?.firstName + ' ' + (o.billingInfo?.contactDetails?.lastName || ''),
            clientEmail:   o.billingInfo?.contactDetails?.email || null,
            total:         o.priceSummary?.total?.amount ? parseFloat(o.priceSummary.total.amount) : null,
            currency:      o.currency || 'USD',
            status:        o.fulfillmentStatus || null,
            paymentStatus: o.paymentStatus || null,
            createdDate:   o.createdDate ? new Date(o.createdDate) : null,
            rawPayload:    o,
          },
          create: {
            connectionId:  connection.id,
            wixId:         o.id,
            clientName:    o.billingInfo?.contactDetails?.firstName + ' ' + (o.billingInfo?.contactDetails?.lastName || ''),
            clientEmail:   o.billingInfo?.contactDetails?.email || null,
            total:         o.priceSummary?.total?.amount ? parseFloat(o.priceSummary.total.amount) : null,
            currency:      o.currency || 'USD',
            status:        o.fulfillmentStatus || null,
            paymentStatus: o.paymentStatus || null,
            createdDate:   o.createdDate ? new Date(o.createdDate) : null,
            rawPayload:    o,
          },
        })
        results.orders++
      }
    } catch (e) {
      results.errors.push(`orders: ${e.message}`)
    }

    // ── Staff ────────────────────────────────────────
    try {
      const staffList = await wixClient.fetchStaff(connection)
      for (const s of staffList) {
        const existing = await prisma.staff.findUnique({
          where: { connectionId_wixId: { connectionId: connection.id, wixId: s.id } },
        })
        await prisma.staff.upsert({
          where: { connectionId_wixId: { connectionId: connection.id, wixId: s.id } },
          update: {
            name:       s.name || null,
            email:      s.email || null,
            role:       s.roleType || null,
            rawPayload: s,
          },
          create: {
            connectionId: connection.id,
            wixId:        s.id,
            name:         s.name || null,
            email:        s.email || null,
            role:         s.roleType || null,
            commission:   existing?.commission ?? 30,
            rawPayload:   s,
          },
        })
        results.staff++
      }
    } catch (e) {
      results.errors.push(`staff: ${e.message}`)
    }

    // Marca sync como concluído
    await prisma.wixConnection.update({
      where: { id: connection.id },
      data: {
        syncStatus: results.errors.length > 0 ? 'partial' : 'idle',
        syncError:  results.errors.length > 0 ? results.errors.join(' | ') : null,
        lastSyncAt: new Date(),
      },
    })

    res.status(200).json({ ok: true, results })

  } catch (err) {
    // Erro fatal
    await prisma.wixConnection.update({
      where: { id: connection.id },
      data: { syncStatus: 'error', syncError: err.message },
    })
    res.status(500).json({ error: err.message })
  }
}
