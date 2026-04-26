// api/wix/data.js
// Retorna todos os dados sincronizados para o dashboard
const { prisma } = require('../../lib/prisma')
const { requireAuth, setCors } = require('../../middleware/auth')

module.exports = async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const user = await requireAuth(req, res)
  if (!user) return

  const connection = await prisma.wixConnection.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  if (!connection) {
    return res.status(200).json({ connected: false })
  }

  const { section = 'dashboard', page = '1', limit = '50', search = '', status = '' } = req.query
  const skip = (parseInt(page) - 1) * parseInt(limit)
  const take = parseInt(limit)

  switch (section) {

    case 'dashboard': {
      const [bookingCount, clientCount, orderAgg, todayBookings, recentBookings, topServices] =
        await Promise.all([
          prisma.booking.count({ where: { connectionId: connection.id } }),
          prisma.client.count({ where: { connectionId: connection.id } }),
          prisma.order.aggregate({
            where: { connectionId: connection.id },
            _sum: { total: true },
          }),
          prisma.booking.count({
            where: {
              connectionId: connection.id,
              startTime: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
                lt:  new Date(new Date().setHours(23, 59, 59, 999)),
              },
            },
          }),
          prisma.booking.findMany({
            where: { connectionId: connection.id },
            orderBy: { startTime: 'desc' },
            take: 10,
          }),
          // Top 5 serviços por bookings
          prisma.booking.groupBy({
            by: ['serviceName'],
            where: { connectionId: connection.id, serviceName: { not: null } },
            _count: { serviceName: true },
            _sum: { price: true },
            orderBy: { _count: { serviceName: 'desc' } },
            take: 5,
          }),
        ])

      return res.status(200).json({
        connected: true,
        connection: {
          siteId: connection.siteId,
          siteName: connection.siteName,
          siteUrl: connection.siteUrl,
          lastSyncAt: connection.lastSyncAt,
          syncStatus: connection.syncStatus,
        },
        kpis: {
          totalRevenue: orderAgg._sum.total || 0,
          bookings: bookingCount,
          clients: clientCount,
          todayBookings,
        },
        recentBookings,
        topServices,
      })
    }

    case 'bookings': {
      const where = {
        connectionId: connection.id,
        ...(search ? {
          OR: [
            { clientName:  { contains: search } },
            { serviceName: { contains: search } },
            { staffName:   { contains: search } },
          ],
        } : {}),
        ...(status ? { status } : {}),
      }
      const [items, total] = await Promise.all([
        prisma.booking.findMany({ where, orderBy: { startTime: 'desc' }, skip, take }),
        prisma.booking.count({ where }),
      ])
      return res.status(200).json({ items, total, page: parseInt(page), limit: take })
    }

    case 'clients': {
      const where = {
        connectionId: connection.id,
        ...(search ? {
          OR: [
            { name:  { contains: search } },
            { email: { contains: search } },
          ],
        } : {}),
      }
      const [items, total] = await Promise.all([
        prisma.client.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
        prisma.client.count({ where }),
      ])
      return res.status(200).json({ items, total })
    }

    case 'services': {
      const items = await prisma.service.findMany({
        where: { connectionId: connection.id },
        orderBy: { name: 'asc' },
      })
      return res.status(200).json({ items })
    }

    case 'orders': {
      const where = {
        connectionId: connection.id,
        ...(search ? {
          OR: [
            { clientName:  { contains: search } },
            { clientEmail: { contains: search } },
          ],
        } : {}),
        ...(status ? { paymentStatus: status } : {}),
      }
      const [items, total] = await Promise.all([
        prisma.order.findMany({ where, orderBy: { createdDate: 'desc' }, skip, take }),
        prisma.order.count({ where }),
      ])
      return res.status(200).json({ items, total })
    }

    case 'staff': {
      const items = await prisma.staff.findMany({
        where: { connectionId: connection.id },
        orderBy: { name: 'asc' },
      })

      // Enriquece com contagem de bookings e receita por staff
      const enriched = await Promise.all(items.map(async (s) => {
        const agg = await prisma.booking.aggregate({
          where: { connectionId: connection.id, staffName: { contains: s.name || '' } },
          _count: true,
          _sum: { price: true },
        })
        return {
          ...s,
          bookingCount: agg._count,
          revenue: agg._sum.price || 0,
        }
      }))

      return res.status(200).json({ items: enriched })
    }

    case 'payroll': {
      const staffList = await prisma.staff.findMany({
        where: { connectionId: connection.id },
      })

      const enriched = await Promise.all(staffList.map(async (s) => {
        const agg = await prisma.booking.aggregate({
          where: {
            connectionId: connection.id,
            staffName: { contains: s.name || '' },
            status: { not: 'CANCELLED' },
          },
          _count: true,
          _sum: { price: true },
        })
        const revenue = agg._sum.price || 0
        const earnings = (revenue * (s.commission || 30)) / 100
        return {
          ...s,
          bookingCount: agg._count,
          revenue,
          earnings: Math.round(earnings * 100) / 100,
        }
      }))

      const totalPayroll = enriched.reduce((acc, s) => acc + s.earnings, 0)

      return res.status(200).json({ items: enriched, totalPayroll })
    }

    default:
      return res.status(400).json({ error: 'Section inválida' })
  }
}
