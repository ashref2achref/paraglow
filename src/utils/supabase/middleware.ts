import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  getVerifiedClaimsCached,
  type VerifiedAuthClaims,
} from '@/lib/adminAuthCache'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getSession() is used only to obtain an opaque cache key and expiry.
  // The session is never trusted for authorization.
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token

  if (!token) {
    return { supabaseResponse, claims: null }
  }

  const claims = await getVerifiedClaimsCached(
    token,
    sessionData.session?.expires_at,
    async () => {
      const { data, error } = await supabase.auth.getClaims()
      return !error && data?.claims
        ? (data.claims as VerifiedAuthClaims)
        : null
    }
  )

  return { supabaseResponse, claims }
}
