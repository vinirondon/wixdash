// lib/db.js
// Substitui o Prisma por queries SQL diretas via Neon HTTP driver
// Sem binários, sem prisma generate, funciona 100% na Vercel

const { neon } = require('@neondatabase/serverless')

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não definida')
  }
  return neon(process.env.DATABASE_URL)
}

module.exports = { getDb }
