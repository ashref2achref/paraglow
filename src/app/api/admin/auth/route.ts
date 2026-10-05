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
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email || email.length > 254 || !email.includes('@') || !password || password.length > 256) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 })
    }

    const role = data.user.app_metadata?.role
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
