// lib/wix.js
const WIX_API = 'https://www.wixapis.com'

async function wixFetch(connection, path, options = {}) {
  const res = await fetch(`${WIX_API}${path}`, {
    ...options,
    headers: {
      'Authorization': connection.accessToken,
      'wix-site-id':   connection.siteId,
      'Content-Type':  'application/json',
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Wix API ${path} → ${res.status}: ${text}`)
  }
  return res.json()
}

async function fetchAllPages(connection, path, bodyFn, extractFn) {
  const results = []
  let cursor = null
  let attempts = 0
  do {
    const data = await wixFetch(connection, path, { method: 'POST', body: JSON.stringify(bodyFn(cursor)) })
    results.push(...(extractFn(data) || []))
    cursor = data.pagingMetadata?.cursors?.next || null
    attempts++
  } while (cursor && attempts < 20)
  return results
}

async function fetchBookings(connection) {
  return fetchAllPages(
    connection,
    '/bookings/v2/bookings/query',
    (cursor) => ({ query: { paging: cursor ? { cursor } : { limit: 100 }, sort: [{ fieldName: 'startDate', order: 'DESC' }] } }),
    (d) => d.bookings || []
  )
}

async function fetchContacts(connection) {
  return fetchAllPages(
    connection,
    '/contacts/v4/contacts/query',
    (cursor) => ({ query: { paging: cursor ? { cursor } : { limit: 100 } } }),
    (d) => d.contacts || []
  )
}

async function fetchServices(connection) {
  return fetchAllPages(
    connection,
    '/bookings/v2/services/query',
    (cursor) => ({ query: { paging: cursor ? { cursor } : { limit: 100 } } }),
    (d) => d.services || []
  )
}

async function fetchOrders(connection) {
  try {
    return await fetchAllPages(
      connection,
      '/ecom/v1/orders/search',
      (cursor) => ({ search: { cursorPaging: cursor ? { cursor } : { limit: 100 } } }),
      (d) => d.orders || []
    )
  } catch(e) {
    console.error('orders:', e.message)
    return []
  }
}

async function fetchStaff(connection) {
  // Tenta múltiplos endpoints pois o Wix mudou a API de staff
  const endpoints = [
    // v2 — novo endpoint
    async () => {
      const d = await wixFetch(connection, '/bookings/v2/staff-members/query', {
        method: 'POST',
        body: JSON.stringify({ query: { paging: { limit: 100 } } })
      })
      return d.staffMembers || d.staff_members || []
    },
    // v1 resources — endpoint antigo
    async () => {
      const d = await wixFetch(connection, '/bookings/v1/resources/query', {
        method: 'POST',
        body: JSON.stringify({ query: { paging: { limit: 100 } }, resourceTypes: ['STAFF_MEMBER'] })
      })
      return d.resources || []
    },
    // v1 staff — mais antigo
    async () => {
      const d = await wixFetch(connection, '/bookings/v1/staff', { method: 'GET' })
      return d.staff || d.resources || []
    },
    // calendar resources
    async () => {
      const d = await wixFetch(connection, '/calendar/v1/resources/query', {
        method: 'POST',
        body: JSON.stringify({ query: { paging: { limit: 100 } } })
      })
      return d.resources || []
    },
  ]

  for (const fn of endpoints) {
    try {
      const result = await fn()
      if (result.length > 0) {
        console.log(`staff found: ${result.length}`)
        return result
      }
    } catch(e) {
      console.log(`staff endpoint failed: ${e.message}`)
    }
  }

  console.error('all staff endpoints failed')
  return []
}

module.exports = { fetchBookings, fetchContacts, fetchServices, fetchOrders, fetchStaff, wixFetch }
