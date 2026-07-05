import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getAdminCredentials } from '@/lib/adminCredentials'
import { clearAdminSessionCookie, createAdminSessionToken, setAdminSessionCookie } from '@/lib/adminSession'
import { getAdminSessionSecret } from '@/lib/adminSessionShared'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body
    const credentials = await getAdminCredentials()

    if (!credentials.passwordHash) {
      return NextResponse.json({
        error: 'ADMIN_PASSWORD_HASH doit etre configure avant toute connexion admin.',
      }, { status: 503 })
    }

    if (!getAdminSessionSecret()) {
      return NextResponse.json({
        error: 'SESSION_SECRET doit etre configure avec au moins 32 caracteres.',
      }, { status: 503 })
    }

    const isValid =
      email === credentials.email &&
      bcrypt.compareSync(String(password || ''), credentials.passwordHash)

    if (!isValid) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 })
    }

    const response = NextResponse.json({ success: true, message: 'Connexion reussie' })
    setAdminSessionCookie(response, createAdminSessionToken())
    return response
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Deconnexion reussie' })
  clearAdminSessionCookie(response)
  return response
}
