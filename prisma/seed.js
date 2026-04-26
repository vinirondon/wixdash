// prisma/seed.js
// Popula o banco com dados de demonstração.
// Qualquer pessoa pode testar o sistema sem precisar conectar o Wix.
//
// Rodar: node prisma/seed.js

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // ── 1. Usuário demo ──────────────────────────────────
  const passwordHash = await bcrypt.hash('demo1234', 12)

  const user = await prisma.user.upsert({
    where: { email: 'demo@wixdash.com' },
    update: {},
    create: {
      email:        'demo@wixdash.com',
      passwordHash,
      name:         'Demo User',
      plan:         'pro',
    },
  })

  console.log(`✅ Usuário demo criado: demo@wixdash.com / demo1234`)

  // ── 2. Conexão Wix fake ──────────────────────────────
  // accessToken / refreshToken são placeholders — o sistema funciona com dados do seed
  const conn = await prisma.wixConnection.upsert({
    where: { id: 'demo_connection_001' },
    update: {},
    create: {
      id:           'demo_connection_001',
      userId:       user.id,
      accessToken:  'DEMO_TOKEN_NOT_REAL',
      refreshToken: 'DEMO_REFRESH_NOT_REAL',
      expiresAt:    new Date('2099-01-01'),
      siteId:       'demo-site-001',
      siteName:     'Glow Beauty Studio',
      siteUrl:      'https://glowbeauty.wixsite.com/studio',
      syncStatus:   'idle',
      lastSyncAt:   new Date(),
    },
  })

  console.log('✅ Conexão Wix demo criada')

  // ── 3. Staff ─────────────────────────────────────────
  const staffData = [
    { wixId: 'staff-001', name: 'Emma Johnson',  email: 'emma@glowbeauty.com',   role: 'Aesthetician',      commission: 35 },
    { wixId: 'staff-002', name: 'Carlos Reyes',  email: 'carlos@glowbeauty.com', role: 'Massage Therapist', commission: 35 },
    { wixId: 'staff-003', name: 'Maya Santos',   email: 'maya@glowbeauty.com',   role: 'Nail Technician',   commission: 30 },
    { wixId: 'staff-004', name: 'Sofia Lima',    email: 'sofia@glowbeauty.com',  role: 'Nail Technician',   commission: 30 },
  ]

  for (const s of staffData) {
    await prisma.staff.upsert({
      where: { connectionId_wixId: { connectionId: conn.id, wixId: s.wixId } },
      update: {},
      create: { connectionId: conn.id, ...s },
    })
  }
  console.log(`✅ ${staffData.length} staff criados`)

  // ── 4. Serviços ──────────────────────────────────────
  const serviceData = [
    { wixId: 'svc-001', name: 'Facial Treatment',    category: 'Skin Care',    durationMins: 60,  price: 120, status: 'ACTIVE' },
    { wixId: 'svc-002', name: 'Swedish Massage',     category: 'Massage',      durationMins: 90,  price: 150, status: 'ACTIVE' },
    { wixId: 'svc-003', name: 'Haircut + Style',     category: 'Hair',         durationMins: 45,  price: 85,  status: 'ACTIVE' },
    { wixId: 'svc-004', name: 'Deep Tissue Massage', category: 'Massage',      durationMins: 60,  price: 130, status: 'ACTIVE' },
    { wixId: 'svc-005', name: 'Manicure',            category: 'Nails',        durationMins: 45,  price: 55,  status: 'ACTIVE' },
    { wixId: 'svc-006', name: 'Pedicure',            category: 'Nails',        durationMins: 45,  price: 60,  status: 'ACTIVE' },
    { wixId: 'svc-007', name: 'Waxing',              category: 'Hair Removal', durationMins: 30,  price: 65,  status: 'ACTIVE' },
    { wixId: 'svc-008', name: 'Lash Extensions',     category: 'Eyes',         durationMins: 120, price: 180, status: 'PAUSED' },
  ]

  for (const s of serviceData) {
    await prisma.service.upsert({
      where: { connectionId_wixId: { connectionId: conn.id, wixId: s.wixId } },
      update: {},
      create: { connectionId: conn.id, currency: 'USD', ...s },
    })
  }
  console.log(`✅ ${serviceData.length} serviços criados`)

  // ── 5. Clientes ──────────────────────────────────────
  const clientData = [
    { wixId: 'cli-001', name: 'Sarah Lewis',   email: 'sarah.lewis@email.com',  phone: '(305) 555-0121' },
    { wixId: 'cli-002', name: 'Mike Johnson',  email: 'm.johnson@email.com',    phone: '(305) 555-0132' },
    { wixId: 'cli-003', name: 'Anna Park',     email: 'anna.park@email.com',    phone: '(786) 555-0143' },
    { wixId: 'cli-004', name: 'Robert Chen',   email: 'rchen@email.com',        phone: '(786) 555-0154' },
    { wixId: 'cli-005', name: 'Tina Mills',    email: 'tina.m@email.com',       phone: '(305) 555-0165' },
    { wixId: 'cli-006', name: 'James Wilson',  email: 'jwilson@email.com',      phone: '(305) 555-0176' },
    { wixId: 'cli-007', name: 'Clara Brooks',  email: 'cbrooks@email.com',      phone: '(786) 555-0187' },
    { wixId: 'cli-008', name: 'David Kim',     email: 'dkim@email.com',         phone: '(305) 555-0198' },
    { wixId: 'cli-009', name: 'Natalie Cruz',  email: 'natcruz@email.com',      phone: '(305) 555-0209' },
    { wixId: 'cli-010', name: 'Evan Torres',   email: 'etorres@email.com',      phone: '(786) 555-0210' },
    { wixId: 'cli-011', name: 'Diana Morgan',  email: 'diana.m@email.com',      phone: '(305) 555-0221' },
    { wixId: 'cli-012', name: 'Kevin Hart',    email: 'khart@email.com',        phone: '(786) 555-0232' },
  ]

  for (const c of clientData) {
    await prisma.client.upsert({
      where: { connectionId_wixId: { connectionId: conn.id, wixId: c.wixId } },
      update: {},
      create: { connectionId: conn.id, ...c },
    })
  }
  console.log(`✅ ${clientData.length} clientes criados`)

  // ── 6. Bookings (últimos 30 dias) ────────────────────
  const now = new Date()
  const staffNames    = staffData.map(s => s.name)
  const serviceNames  = serviceData.filter(s => s.status === 'ACTIVE').map(s => ({ name: s.name, price: s.price, duration: s.durationMins }))
  const clientNames   = clientData.map(c => c.name)
  const statuses      = ['CONFIRMED', 'CONFIRMED', 'CONFIRMED', 'PENDING', 'CANCELED']

  const bookings = []
  for (let i = 0; i < 80; i++) {
    const daysAgo   = Math.floor(Math.random() * 30)
    const hour      = 9 + Math.floor(Math.random() * 9)  // 9h-18h
    const start     = new Date(now)
    start.setDate(start.getDate() - daysAgo)
    start.setHours(hour, 0, 0, 0)

    const svc   = serviceNames[Math.floor(Math.random() * serviceNames.length)]
    const end   = new Date(start.getTime() + svc.duration * 60000)
    const staff = staffNames[Math.floor(Math.random() * staffNames.length)]
    const client = clientNames[Math.floor(Math.random() * clientNames.length)]
    const status = statuses[Math.floor(Math.random() * statuses.length)]

    bookings.push({
      wixId:       `booking-${String(i + 1).padStart(3, '0')}`,
      clientName:  client,
      clientEmail: clientData.find(c => c.name === client)?.email || null,
      serviceName: svc.name,
      staffName:   staff,
      startTime:   start,
      endTime:     end,
      status,
      price:       status === 'CANCELED' ? null : svc.price,
      currency:    'USD',
    })
  }

  // Adiciona bookings de hoje para o dashboard
  const todayBookings = [
    { clientName: 'Sarah Lewis',  serviceName: 'Facial Treatment',    staffName: 'Emma Johnson',  hour: 10, status: 'CONFIRMED', price: 120 },
    { clientName: 'Mike Johnson', serviceName: 'Swedish Massage',     staffName: 'Carlos Reyes',  hour: 11, status: 'PENDING',   price: 150 },
    { clientName: 'Anna Park',    serviceName: 'Haircut + Style',     staffName: 'Emma Johnson',  hour: 14, status: 'CONFIRMED', price: 85  },
    { clientName: 'Robert Chen',  serviceName: 'Deep Tissue Massage', staffName: 'Carlos Reyes',  hour: 16, status: 'CONFIRMED', price: 130 },
    { clientName: 'Tina Mills',   serviceName: 'Manicure',            staffName: 'Maya Santos',   hour: 17, status: 'CONFIRMED', price: 55  },
  ]

  for (let i = 0; i < todayBookings.length; i++) {
    const b = todayBookings[i]
    const start = new Date(); start.setHours(b.hour, 0, 0, 0)
    const end   = new Date(start.getTime() + 60 * 60000)
    bookings.push({
      wixId:       `booking-today-${i + 1}`,
      clientName:  b.clientName,
      clientEmail: clientData.find(c => c.name === b.clientName)?.email || null,
      serviceName: b.serviceName,
      staffName:   b.staffName,
      startTime:   start,
      endTime:     end,
      status:      b.status,
      price:       b.price,
      currency:    'USD',
    })
  }

  for (const b of bookings) {
    await prisma.booking.upsert({
      where: { connectionId_wixId: { connectionId: conn.id, wixId: b.wixId } },
      update: {},
      create: { connectionId: conn.id, ...b },
    })
  }
  console.log(`✅ ${bookings.length} bookings criados`)

  // ── 7. Orders ────────────────────────────────────────
  const orderStatuses  = ['FULFILLED', 'FULFILLED', 'NOT_FULFILLED', 'CANCELED']
  const paymentStatuses = ['PAID', 'PAID', 'PAID', 'PENDING', 'REFUNDED']

  for (let i = 0; i < 50; i++) {
    const daysAgo   = Math.floor(Math.random() * 30)
    const date      = new Date(now)
    date.setDate(date.getDate() - daysAgo)

    const client = clientData[Math.floor(Math.random() * clientData.length)]
    const svc    = serviceNames[Math.floor(Math.random() * serviceNames.length)]
    const pStatus = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)]
    const oStatus = orderStatuses[Math.floor(Math.random() * orderStatuses.length)]

    await prisma.order.upsert({
      where: { connectionId_wixId: { connectionId: conn.id, wixId: `order-${String(i + 1).padStart(3, '0')}` } },
      update: {},
      create: {
        connectionId:  conn.id,
        wixId:         `order-${String(i + 1).padStart(3, '0')}`,
        clientName:    client.name,
        clientEmail:   client.email,
        total:         pStatus === 'REFUNDED' ? null : svc.price,
        currency:      'USD',
        status:        oStatus,
        paymentStatus: pStatus,
        createdDate:   date,
      },
    })
  }
  console.log('✅ 50 orders criadas')

  console.log('\n🎉 Seed concluído!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Login de demo:')
  console.log('  Email:  demo@wixdash.com')
  console.log('  Senha:  demo1234')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch(e => { console.error('❌ Seed falhou:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
