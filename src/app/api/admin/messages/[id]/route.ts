import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function checkAuth(request: NextRequest) {
  return checkAdminAuth(request)
}

// PUT: mark a message as read/unread
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params

  try {
    const body = await request.json()
    if (typeof body.isRead !== 'boolean') {
      return NextResponse.json({ error: 'isRead (boolean) requis' }, { status: 400 })
    }

    const message = await prisma.contactMessage.update({
      where: { id },
      data: { isRead: body.isRead },
    })

    return NextResponse.json({ message })
  } catch (error: any) {
    console.error('Admin message PUT error:', error)
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 })
  }
}
