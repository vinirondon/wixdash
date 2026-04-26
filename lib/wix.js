// lib/wix.js
// Toda comunicação com a API do Wix passa por aqui.
// Troca o access_token automaticamente quando expira.

const { prisma } = require('./prisma')

const WIX_TOKEN_URL = 'https://www.wix.com/oauth/access'
const WIX_API_BASE  = 'https://www.wixapis.com'

// ── Refresh token se necessário ───────────────────────
async function getValidToken(connection) {
  const now = new Date()
  const expiresAt = new Date(connection.expiresAt)

  // Renova se expira em menos de 5 minutos
  if (expiresAt - now < 5 * 60 * 1000) {
    const res = await fetch(WIX_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: process.env.WIX_CLIENT_ID,
        client_secret: process.env.WIX_CLIENT_SECRET,
        refresh_token: connection.refreshToken,
      }),
    })

    if (!res.ok) throw new Error('Failed to refresh Wix token')

    const data = await res.json()

    // Salva os novos tokens
    await prisma.wixConnection.update({
      where: { id: connection.id },
      data: {
        accessToken:  data.access_token,
        refreshToken: data.refresh_token || connection.refreshToken,
        expiresAt:    new Date(Date.now() + data.expires_in * 1000),
      },
    })

    return data.access_token
  }

  return connection.accessToken
}

// ── Chamada genérica autenticada ──────────────────────
async function wixFetch(connection, path, options = {}) {
  const token = await getValidToken(connection)

  const res = await fetch(`${WIX_API_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json',
      'wix-site-id': connection.siteId,
      ...(options.headers || {}),
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Wix API ${path} → ${res.status}: ${text}`)
  }

  return res.json()
}

// ── Busca paginada genérica ───────────────────────────
async function fetchAllPages(connection, path, bodyFn, extractFn) {
  const results = []
  let cursor = null

  do {
    const body = bodyFn(cursor)
    const data = await wixFetch(connection, path, {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const items = extractFn(data)
    results.push(...items)

    cursor = data.pagingMetadata?.cursors?.next || null
  } while (cursor)

  return results
}

// ── Bookings ──────────────────────────────────────────
async function fetchBookings(connection) {
  return fetchAllPages(
    connection,
    '/bookings/v2/bookings/query',
    (cursor) => ({
      query: {
        paging: cursor ? { cursor } : { limit: 100 },
        sort: [{ fieldName: 'startDate', order: 'DESC' }],
      },
    }),
    (data) => data.bookings || []
  )
}

// ── Contacts (Clientes) ───────────────────────────────
async function fetchContacts(connection) {
  return fetchAllPages(
    connection,
    '/contacts/v4/contacts/query',
    (cursor) => ({
      query: {
        paging: cursor ? { cursor } : { limit: 100 },
        sort: [{ fieldName: 'createdDate', order: 'DESC' }],
      },
    }),
    (data) => data.contacts || []
  )
}

// ── Services ──────────────────────────────────────────
async function fetchServices(connection) {
  return fetchAllPages(
    connection,
    '/bookings/v2/services/query',
    (cursor) => ({
      query: {
        paging: cursor ? { cursor } : { limit: 100 },
      },
    }),
    (data) => data.services || []
  )
}

// ── Orders ────────────────────────────────────────────
async function fetchOrders(connection) {
  return fetchAllPages(
    connection,
    '/ecom/v1/orders/search',
    (cursor) => ({
      search: {
        cursorPaging: cursor ? { cursor } : { limit: 100 },
        sort: [{ fieldName: 'createdDate', order: 'DESC' }],
      },
    }),
    (data) => data.orders || []
  )
}

// ── Staff ─────────────────────────────────────────────
async function fetchStaff(connection) {
  // Staff usa paginação por offset
  const results = []
  let skip = 0
  const limit = 50

  while (true) {
    const data = await wixFetch(connection, '/bookings/v1/staff', {
      method: 'GET',
    })

    // A API de staff do Wix retorna todos de uma vez (sem paginação)
    const items = data.staff || data.resources || []
    results.push(...items)
    break // staff geralmente é pequeno, sem necessidade de paginar
  }

  return results
}

// ── Info do site ──────────────────────────────────────
async function fetchSiteInfo(connection) {
  return wixFetch(connection, '/site-properties/v4/properties', {
    method: 'GET',
  })
}

module.exports = {
  fetchBookings,
  fetchContacts,
  fetchServices,
  fetchOrders,
  fetchStaff,
  fetchSiteInfo,
  wixFetch,
}
