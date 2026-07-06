import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { isRateLimited } from '@/lib/rateLimit'
import { contactSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (await isRateLimited(request, 'contact', { windowMs: 60 * 60 * 1000, maxHits: 5 })) {
    return NextResponse.json(
      { error: 'Trop de messages envoyés. Veuillez réessayer plus tard.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const validated = contactSchema.safeParse(body)
    
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 })
    }

    const { name, email, phone, subject, message } = validated.data

    const contactMessage = await prisma.contactMessage.create({
      data: {
        nom: name,
        email,
        telephone: phone || null,
        sujet: subject || null,
        message,
      },
    })

    return NextResponse.json({ success: true, id: contactMessage.id }, { status: 201 })
  } catch (error) {
    console.error('Contact form submission error:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'envoi du message' }, { status: 500 })
  }
}

