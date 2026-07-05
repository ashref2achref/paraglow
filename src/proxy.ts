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

  // 1. Run Supabase Session update/refresh
  const { supabaseResponse, user } = await updateSession(request)

  // 2. Protect /admin routes
  if (pathname.startsWith('/admin')) {
    const role = user?.user_metadata?.role || user?.app_metadata?.role
    const isAuthenticated = !!user && role === 'ADMIN'

    if (!isAuthenticated && pathname !== '/admin/login') {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    if (isAuthenticated && pathname === '/admin/login') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
    return supabaseResponse
  }

  if (pathname.startsWith('/api')) {
    return supabaseResponse
  }

  const intlMiddleware = await getIntlMiddleware()
  const response = intlMiddleware(request)
  
  // Copy cookies from supabaseResponse to the intl response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, {
      path: cookie.path,
      domain: cookie.domain,
      maxAge: cookie.maxAge,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      httpOnly: cookie.httpOnly,
    })
  })

  return response
}

export const config = {
  matcher: [
    '/((?!_next|_vercel|.*\\..*).*)'
  ]
}
