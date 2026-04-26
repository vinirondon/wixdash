const { PrismaClient } = require(@prisma/client)
const { neonConfig } = require(@neondatabase/serverless)
const ws = require(ws)
neonConfig.webSocketConstructor = ws
const prisma = global.prisma || new PrismaClient()
if (process.env.NODE_ENV !== production) global.prisma = prisma
module.exports = { prisma }