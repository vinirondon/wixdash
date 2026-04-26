// lib/prisma.js
const { PrismaClient } = require('@prisma/client')

// Em serverless, cada invocação pode criar uma nova instância.
// Este padrão reutiliza a instância se já existir no processo.
const globalForPrisma = global

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

module.exports = { prisma }
