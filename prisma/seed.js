require('dotenv').config()
const { neon } = require('@neondatabase/serverless')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const sql = neon(process.env.DATABASE_URL)
const id = () => crypto.randomBytes(12).toString('hex')

async function main() {
  console.log('🌱 Criando tabelas e dados demo...')

  // Tabelas
  await sql`CREATE TABLE IF NOT EXISTS "User" (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, "passwordHash" TEXT NOT NULL, name TEXT, plan TEXT DEFAULT 'free', "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW())`
  await sql`CREATE TABLE IF NOT EXISTS "WixConnection" (id TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "accessToken" TEXT NOT NULL, "refreshToken" TEXT NOT NULL, "expiresAt" TIMESTAMPTZ NOT NULL, "siteId" TEXT NOT NULL, "siteName" TEXT, "siteUrl" TEXT, "lastSyncAt" TIMESTAMPTZ, "syncStatus" TEXT DEFAULT 'idle', "syncError" TEXT, "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW())`
  await sql`CREATE TABLE IF NOT EXISTS "Booking" (id TEXT PRIMARY KEY, "connectionId" TEXT NOT NULL, "wixId" TEXT NOT NULL, "clientName" TEXT, "clientEmail" TEXT, "serviceName" TEXT, "staffName" TEXT, "startTime" TIMESTAMPTZ, "endTime" TIMESTAMPTZ, status TEXT, price FLOAT, currency TEXT DEFAULT 'USD', "rawPayload" TEXT, "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW(), UNIQUE("connectionId","wixId"))`
  await sql`CREATE TABLE IF NOT EXISTS "Client" (id TEXT PRIMARY KEY, "connectionId" TEXT NOT NULL, "wixId" TEXT NOT NULL, name TEXT, email TEXT, phone TEXT, "rawPayload" TEXT, "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW(), UNIQUE("connectionId","wixId"))`
  await sql`CREATE TABLE IF NOT EXISTS "Service" (id TEXT PRIMARY KEY, "connectionId" TEXT NOT NULL, "wixId" TEXT NOT NULL, name TEXT, category TEXT, "durationMins" INT, price FLOAT, currency TEXT DEFAULT 'USD', status TEXT, "rawPayload" TEXT, "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW(), UNIQUE("connectionId","wixId"))`
  await sql`CREATE TABLE IF NOT EXISTS "Order" (id TEXT PRIMARY KEY, "connectionId" TEXT NOT NULL, "wixId" TEXT NOT NULL, "clientName" TEXT, "clientEmail" TEXT, total FLOAT, currency TEXT DEFAULT 'USD', status TEXT, "paymentStatus" TEXT, "createdDate" TIMESTAMPTZ, "rawPayload" TEXT, "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW(), UNIQUE("connectionId","wixId"))`
  await sql`CREATE TABLE IF NOT EXISTS "Staff" (id TEXT PRIMARY KEY, "connectionId" TEXT NOT NULL, "wixId" TEXT NOT NULL, name TEXT, email TEXT, role TEXT, commission FLOAT DEFAULT 30, "rawPayload" TEXT, "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW(), UNIQUE("connectionId","wixId"))`

  console.log('✅ Tabelas criadas')

  const passwordHash = await bcrypt.hash('demo1234', 12)
  const userId = id()
  await sql`INSERT INTO "User" (id, email, "passwordHash", name, plan) VALUES (${userId}, 'demo@wixdash.com', ${passwordHash}, 'Demo User', 'pro') ON CONFLICT (email) DO NOTHING`

  const existingUser = await sql`SELECT id FROM "User" WHERE email = 'demo@wixdash.com' LIMIT 1`
  const uid = existingUser[0].id
  const connId = 'demo_connection_001'

  await sql`INSERT INTO "WixConnection" (id, "userId", "accessToken", "refreshToken", "expiresAt", "siteId", "siteName", "siteUrl", "syncStatus", "lastSyncAt") VALUES (${connId}, ${uid}, 'DEMO', 'DEMO', '2099-01-01', 'demo-site-001', 'Glow Beauty Studio', 'https://glowbeauty.wixsite.com', 'idle', NOW()) ON CONFLICT (id) DO NOTHING`

  const staffData = [
    { wixId:'staff-001', name:'Emma Johnson',  email:'emma@glow.com',   role:'Aesthetician',      commission:35 },
    { wixId:'staff-002', name:'Carlos Reyes',  email:'carlos@glow.com', role:'Massage Therapist', commission:35 },
    { wixId:'staff-003', name:'Maya Santos',   email:'maya@glow.com',   role:'Nail Technician',   commission:30 },
    { wixId:'staff-004', name:'Sofia Lima',    email:'sofia@glow.com',  role:'Nail Technician',   commission:30 },
  ]
  for (const s of staffData) {
    await sql`INSERT INTO "Staff" (id,"connectionId","wixId",name,email,role,commission) VALUES (${id()},${connId},${s.wixId},${s.name},${s.email},${s.role},${s.commission}) ON CONFLICT ("connectionId","wixId") DO NOTHING`
  }

  const services = [
    { wixId:'svc-001', name:'Facial Treatment',    category:'Skin Care',    durationMins:60,  price:120 },
    { wixId:'svc-002', name:'Swedish Massage',     category:'Massage',      durationMins:90,  price:150 },
    { wixId:'svc-003', name:'Haircut + Style',     category:'Hair',         durationMins:45,  price:85  },
    { wixId:'svc-004', name:'Deep Tissue Massage', category:'Massage',      durationMins:60,  price:130 },
    { wixId:'svc-005', name:'Manicure',            category:'Nails',        durationMins:45,  price:55  },
    { wixId:'svc-006', name:'Pedicure',            category:'Nails',        durationMins:45,  price:60  },
    { wixId:'svc-007', name:'Waxing',              category:'Hair Removal', durationMins:30,  price:65  },
  ]
  for (const s of services) {
    await sql`INSERT INTO "Service" (id,"connectionId","wixId",name,category,"durationMins",price,currency,status) VALUES (${id()},${connId},${s.wixId},${s.name},${s.category},${s.durationMins},${s.price},'USD','ACTIVE') ON CONFLICT ("connectionId","wixId") DO NOTHING`
  }

  const clients = [
    { wixId:'cli-001', name:'Sarah Lewis',  email:'sarah@email.com',  phone:'(305)555-0121' },
    { wixId:'cli-002', name:'Mike Johnson', email:'mike@email.com',   phone:'(305)555-0132' },
    { wixId:'cli-003', name:'Anna Park',    email:'anna@email.com',   phone:'(786)555-0143' },
    { wixId:'cli-004', name:'Robert Chen',  email:'rchen@email.com',  phone:'(786)555-0154' },
    { wixId:'cli-005', name:'Tina Mills',   email:'tina@email.com',   phone:'(305)555-0165' },
    { wixId:'cli-006', name:'James Wilson', email:'james@email.com',  phone:'(305)555-0176' },
  ]
  for (const c of clients) {
    await sql`INSERT INTO "Client" (id,"connectionId","wixId",name,email,phone) VALUES (${id()},${connId},${c.wixId},${c.name},${c.email},${c.phone}) ON CONFLICT ("connectionId","wixId") DO NOTHING`
  }

  // 60 bookings dos últimos 30 dias
  const svcList = services.filter(s => s.price)
  const staffNames = staffData.map(s => s.name)
  const clientNames = clients.map(c => c.name)
  const statuses = ['CONFIRMED','CONFIRMED','CONFIRMED','PENDING','CANCELED']

  for (let i = 0; i < 60; i++) {
    const daysAgo = Math.floor(Math.random()*30)
    const hour = 9 + Math.floor(Math.random()*9)
    const start = new Date(); start.setDate(start.getDate()-daysAgo); start.setHours(hour,0,0,0)
    const svc = svcList[Math.floor(Math.random()*svcList.length)]
    const end = new Date(start.getTime() + svc.durationMins*60000)
    const staff = staffNames[Math.floor(Math.random()*staffNames.length)]
    const client = clientNames[Math.floor(Math.random()*clientNames.length)]
    const status = statuses[Math.floor(Math.random()*statuses.length)]
    await sql`INSERT INTO "Booking" (id,"connectionId","wixId","clientName","serviceName","staffName","startTime","endTime",status,price,currency) VALUES (${id()},${connId},${'b-'+i},${client},${svc.name},${staff},${start.toISOString()},${end.toISOString()},${status},${status==='CANCELED'?null:svc.price},'USD') ON CONFLICT ("connectionId","wixId") DO NOTHING`
  }

  // 30 orders
  for (let i = 0; i < 30; i++) {
    const daysAgo = Math.floor(Math.random()*30)
    const date = new Date(); date.setDate(date.getDate()-daysAgo)
    const client = clients[Math.floor(Math.random()*clients.length)]
    const svc = svcList[Math.floor(Math.random()*svcList.length)]
    const pStatus = ['PAID','PAID','PAID','PENDING','REFUNDED'][Math.floor(Math.random()*5)]
    await sql`INSERT INTO "Order" (id,"connectionId","wixId","clientName","clientEmail",total,currency,status,"paymentStatus","createdDate") VALUES (${id()},${connId},${'o-'+i},${client.name},${client.email},${svc.price},'USD','FULFILLED',${pStatus},${date.toISOString()}) ON CONFLICT ("connectionId","wixId") DO NOTHING`
  }

  console.log('✅ Seed concluído!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Email: demo@wixdash.com')
  console.log('  Senha: demo1234')
  console.log('━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
