import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Lightweight endpoint polled by the admin sidebar every 30s (same pattern as the
// existing "Commandes" alert badge) — avoids fetching the full message list just to
// render an unread count next to the nav item.
export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const unreadCount = await prisma.contactMessage.count({ where: { isRead: false } })
    return NextResponse.json({ unreadCount })
  } catch (error) {
    console.error('Messages unread-count GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
