/**
 * WHOP API Client Library
 * Server-side only - handles membership verification for Trading Mastery product
 */

const WHOP_API_BASE = 'https://api.whop.com/api/v5/company'

interface WhopMembership {
  id: string
  user_id: string
  product_id: string
  status: string
  valid: boolean
}

interface WhopMembershipsResponse {
  data: WhopMembership[]
  pagination: {
    current_page: number
    total_pages: number
    total_count: number
  }
}

interface WhopUser {
  id: string
  username: string
  email: string
  name: string
}

export interface VerifyResult {
  verified: boolean
  whop_user_id: string | null
  whop_username?: string
  membership_status: string | null
  error?: string
}

function getApiKey(): string {
  const apiKey = process.env.WHOP_API_KEY
  if (!apiKey || apiKey === 'your_whop_api_key_here') {
    throw new Error('WHOP_API_KEY is not configured')
  }
  return apiKey
}

function getProductId(): string {
  return process.env.WHOP_PRODUCT_ID || 'prod_Q8MIud4gKwFDP'
}

async function whopFetch(endpoint: string): Promise<Response> {
  return fetch(`${WHOP_API_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
    },
    cache: 'no-store',
  })
}

async function getWhopUser(userId: string): Promise<WhopUser | null> {
  const response = await whopFetch(`/users/${userId}`)
  if (!response.ok) return null
  return response.json()
}

/**
 * Verify WHOP membership by email.
 * Iterates all memberships for the product, looks up each user to match email.
 */
export async function verifyWhopMembership(email: string): Promise<VerifyResult> {
  const normalizedEmail = email.trim().toLowerCase()
  let page = 1
  const perPage = 50
  const productId = getProductId()

  while (true) {
    const response = await whopFetch(
      `/memberships?product_id=${productId}&per=${perPage}&page=${page}`
    )

    if (!response.ok) {
      return {
        verified: false,
        whop_user_id: null,
        membership_status: null,
        error: `WHOP API error: ${response.status}`,
      }
    }

    const data: WhopMembershipsResponse = await response.json()

    for (const membership of data.data) {
      const user = await getWhopUser(membership.user_id)
      if (user && user.email.toLowerCase() === normalizedEmail) {
        return {
          verified: membership.valid === true,
          whop_user_id: membership.user_id,
          membership_status: membership.status,
          whop_username: user.username,
          error: membership.valid
            ? undefined
            : `Your WHOP membership status is "${membership.status}". Please ensure your Trading Mastery subscription is active.`,
        }
      }
    }

    if (page >= data.pagination.total_pages || data.data.length === 0) {
      break
    }
    page++
  }

  return {
    verified: false,
    whop_user_id: null,
    membership_status: null,
    error: 'No WHOP membership found for this email. Please ensure you have an active Trading Mastery subscription on WHOP using this email address.',
  }
}

/**
 * Check membership by stored whop_user_id (fast path - used during login).
 * Scans memberships for matching user_id without looking up user details.
 */
export async function checkMembershipByUserId(whopUserId: string): Promise<VerifyResult> {
  let page = 1
  const perPage = 50
  const productId = getProductId()

  while (true) {
    const response = await whopFetch(
      `/memberships?product_id=${productId}&per=${perPage}&page=${page}`
    )

    if (!response.ok) {
      return {
        verified: false,
        whop_user_id: whopUserId,
        membership_status: null,
        error: `WHOP API error: ${response.status}`,
      }
    }

    const data: WhopMembershipsResponse = await response.json()

    for (const membership of data.data) {
      if (membership.user_id === whopUserId) {
        return {
          verified: membership.valid === true,
          whop_user_id: whopUserId,
          membership_status: membership.status,
          error: membership.valid
            ? undefined
            : `Your WHOP membership is "${membership.status}". Please renew your Trading Mastery subscription.`,
        }
      }
    }

    if (page >= data.pagination.total_pages || data.data.length === 0) {
      break
    }
    page++
  }

  return {
    verified: false,
    whop_user_id: whopUserId,
    membership_status: null,
    error: 'No membership found for your WHOP account.',
  }
}
