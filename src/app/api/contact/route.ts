import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const nom = optionalString(body.name)
    const email = optionalString(body.email)
    const telephone = optionalString(body.phone)
    const sujet = optionalString(body.subject)
    const message = optionalString(body.message)

    if (!nom || !email || !message) {
      return NextResponse.json({ error: 'Nom, email et message sont requis' }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Adresse email invalide' }, { status: 400 })
    }

    const contactMessage = await prisma.contactMessage.create({
      data: { nom, email, telephone, sujet, message },
    })

    return NextResponse.json({ success: true, id: contactMessage.id }, { status: 201 })
  } catch (error) {
    console.error('Contact form submission error:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'envoi du message' }, { status: 500 })
  }
}
