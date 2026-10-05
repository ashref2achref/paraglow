export type AnalyticsEventName =
  | 'page_view'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'update_cart'
  | 'begin_checkout'
  | 'search'
  | 'view_product'

type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>
  }
}

export function trackEvent(name: AnalyticsEventName, payload: AnalyticsPayload = {}) {
  if (typeof window === 'undefined') return

  const safePayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value) || value === null)
  )

  const event = {
    event: 'paraglow_' + name,
    event_name: name,
    timestamp: new Date().toISOString(),
    ...safePayload,
  }

  window.dataLayer?.push(event)
  window.dispatchEvent(new CustomEvent('paraglow:analytics', { detail: event }))

  try {
    const key = 'paraglow-analytics-debug'
    const previous = JSON.parse(sessionStorage.getItem(key) || '[]') as unknown[]
    sessionStorage.setItem(key, JSON.stringify([...previous.slice(-49), event]))
  } catch {
    // Analytics must never break the shopping experience.
  }
}
