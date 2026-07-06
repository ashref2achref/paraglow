import { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function checkAdminAuth(request?: NextRequest | Request): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      console.warn('[checkAdminAuth] No user found or auth error:', error?.message)
      return false
    }

    const role = user.user_metadata?.role || user.app_metadata?.role
    if (role !== 'ADMIN') {
      console.warn(`[checkAdminAuth] Access denied: User has role "${role}", expected "ADMIN"`)
      return false
    }

    return true
  } catch (err) {
    console.error('[checkAdminAuth] Auth check failed:', err)
    return false
  }
}

// Keep placeholders for backward compatibility
export function verifyAdminSessionToken(token: string | undefined) {
  return false
}

export function createAdminSessionToken() {
  return ''
}

export function setAdminSessionCookie(response: any, token: string) {}

export function clearAdminSessionCookie(response: any) {}

