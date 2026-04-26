// lib/wix.js — chamadas à API do Wix usando API Key (sem OAuth)
const WIX_API = 'https://www.wixapis.com'

async function wixFetch(connection, path, options = {}) {
  const res = await fetch(`${WIX_API}${path}`, {
    ...options,
    headers: {
      'Authorization': connection.accessToken, // accessToken = API Key
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
    const body = bodyFn(cursor)
    const data = await wixFetch(connection, path, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    const items = extractFn(data) || []
    results.push(...items)
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
    console.error('orders fetch error (may not have ecom):', e.message)
    return []
  }
}

async function fetchStaff(connection) {
  try {
    const data = await wixFetch(connection, '/bookings/v1/staff', { method: 'GET' })
    return data.staff || data.resources || []
  } catch(e) {
    console.error('staff fetch error:', e.message)
    return []
  }
}

module.exports = { fetchBookings, fetchContacts, fetchServices, fetchOrders, fetchStaff, wixFetch }
