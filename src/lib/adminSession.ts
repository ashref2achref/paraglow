import { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import {
  getVerifiedClaimsCached,
  type VerifiedAuthClaims,
} from '@/lib/adminAuthCache'

export async function checkAdminAuth(request?: NextRequest | Request): Promise<boolean> {
  void request

  try {
    const supabase = await createClient()

    // The raw session is only an opaque token source for the cache key.
    // A cache miss always goes through verified getClaims().
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    if (!token) return false

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

    return claims?.app_metadata?.role === 'ADMIN'
  } catch (err) {
    console.error('[checkAdminAuth] Auth verification failed:', err)
    return false
  }
}
