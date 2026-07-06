import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { isRateLimited } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (await isRateLimited(request, 'login', { windowMs: 15 * 60 * 1000, maxHits: 5 })) {
    return NextResponse.json(
      { error: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const { email, password } = body
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    const role = data.user.user_metadata?.role || data.user.app_metadata?.role
    if (role !== 'ADMIN') {
      await supabase.auth.signOut()
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    return NextResponse.json({ success: true, message: 'Connexion réussie' })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.json({ success: true, message: 'Déconnexion réussie' })
}
