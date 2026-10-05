import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'
import { getPreferredLocale } from './lib/preferredLocale'
import { updateSession } from './utils/supabase/middleware'

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

  // Only admin UI routes need Supabase session verification here.
  // Admin API routes verify themselves with checkAdminAuth(), while the public
  // storefront has no authenticated data dependency. Avoiding a remote auth
  // request for every public/API request removes a major navigation bottleneck.
  if (pathname.startsWith('/admin')) {
    const { supabaseResponse, claims } = await updateSession(request)
    const role = claims?.app_metadata?.role
    const isAuthenticated = Boolean(claims?.sub) && role === 'ADMIN'

    if (!isAuthenticated && pathname !== '/admin/login') {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    if (isAuthenticated && pathname === '/admin/login') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }

    return supabaseResponse
  }

  const intlMiddleware = await getIntlMiddleware()
  return intlMiddleware(request)
}

export const config = {
  // API routes are intentionally excluded. They already perform their own
  // authorization and should not pay for a second auth verification in Proxy.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
