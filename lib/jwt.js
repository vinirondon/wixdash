// lib/jwt.js
const { SignJWT, jwtVerify } = require('jose')

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET)

async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET)
}

async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload
  } catch {
    return null
  }
}

module.exports = { signToken, verifyToken }
