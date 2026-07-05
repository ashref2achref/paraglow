import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Lightweight polling endpoint for the admin sidebar badge.
 * Returns only the count of unconfirmed site orders past the alert threshold.
 * Replaces the previous pattern of fetching full order data via /api/admin/orders?limit=1
 * just to extract nonConfirmedAlertCount (which triggered 5 DB queries).
 */
export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    // Read alert threshold from settings (default 24h)
    let alertHours = 24
    try {
      const commSettings = await prisma.setting.findUnique({ where: { key: 'commandes' } })
      if (commSettings) {
        const parsed = JSON.parse(commSettings.value) as { alertThresholdHours?: unknown }
        const parsedHours = Number.parseInt(String(parsed.alertThresholdHours || ''), 10)
        if (Number.isFinite(parsedHours) && parsedHours > 0) alertHours = parsedHours
      }
    } catch {}

    const alertDate = new Date()
    alertDate.setHours(alertDate.getHours() - alertHours)

    const count = await prisma.order.count({
      where: {
        source: 'SITE',
        status: 'PENDING',
        confirmee: false,
        supprime: false,
        createdAt: { lt: alertDate },
      },
    })

    return NextResponse.json({ count })
  } catch (error) {
    console.error('Orders alert-count GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
