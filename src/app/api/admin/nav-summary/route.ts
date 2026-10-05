import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const [commSettings, unreadMessagesCount] = await Promise.all([
      prisma.setting.findUnique({ where: { key: 'commandes' } }),
      prisma.contactMessage.count({ where: { isRead: false } }),
    ])

    let alertHours = 24
    if (commSettings) {
      try {
        const parsed = JSON.parse(commSettings.value) as { alertThresholdHours?: unknown }
        const hours = Number.parseInt(String(parsed.alertThresholdHours || ''), 10)
        if (Number.isFinite(hours) && hours > 0) alertHours = hours
      } catch {}
    }

    const alertDate = new Date(Date.now() - alertHours * 60 * 60 * 1000)
    const orderAlertCount = await prisma.order.count({
      where: {
        source: 'SITE',
        status: 'PENDING',
        confirmee: false,
        supprime: false,
        createdAt: { lt: alertDate },
      },
    })

    return NextResponse.json(
      { orderAlertCount, unreadMessagesCount },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (error) {
    console.error('Admin nav-summary GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
