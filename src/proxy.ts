import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'
import { checkAdminAuthEdge } from './lib/adminSessionProxy'
import { getPreferredLocale } from './lib/preferredLocale'

// The next-intl middleware handler is rebuilt only when the resolved preferred
// locale actually changes (getPreferredLocale has its own short-TTL cache on
// top of this) — not on every request. `locales` and `localePrefix` always
// come from the static routing.ts; only `defaultLocale` is swapped, which only
// affects the fallback used for a visitor hitting "/" with no locale cookie
// and no matching Accept-Language — every already-prefixed route (/en/..,
// /ar/..) and the structural list of supported locales are untouched.
let cachedMiddlewareLocale: string | null = null
let cachedIntlMiddleware = createMiddleware(routing)

async function getIntlMiddleware() {
  const preferredLocale = await getPreferredLocale()
  if (preferredLocale !== cachedMiddlewareLocale) {
    cachedMiddlewareLocale = preferredLocale
    cachedIntlMiddleware = createMiddleware({ ...routing, defaultLocale: preferredLocale })
  }
  return cachedIntlMiddleware
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin')) {
    const adminSessionIsValid = await checkAdminAuthEdge(request)
    if (!adminSessionIsValid && pathname !== '/admin/login') {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    if (adminSessionIsValid && pathname === '/admin/login') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
    return NextResponse.next()
  }

  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  const intlMiddleware = await getIntlMiddleware()
  return intlMiddleware(request)
}

export const config = {
  matcher: [
    '/((?!_next|_vercel|.*\\..*).*)'
  ]
}
