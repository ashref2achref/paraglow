import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function checkAuth(request: NextRequest) {
  return await checkAdminAuth(request);}

// GET: single promo code with its full order history, usage stats, and per-client breakdown
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAuth(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params

  try {
    const promo = await prisma.promoCode.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          include: { client: true },
        },
      },
    })

    if (!promo) return NextResponse.json({ error: 'Code promo introuvable' }, { status: 404 })

    const { orders, ...promoFields } = promo

    const generatedCA = orders.reduce((sum, o) => sum + o.total, 0)
    const totalDiscountApplied = orders.reduce((sum, o) => sum + o.promoDiscount, 0)

    const nonCancelledOrders = orders.filter((o) => o.status !== 'CANCELLED')
    const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED')
    const deliverySuccessRate = nonCancelledOrders.length > 0
      ? (deliveredOrders.length / nonCancelledOrders.length) * 100
      : null

    const exhaustionRate = promo.maxUses ? (promo.usedCount / promo.maxUses) * 100 : null

    // Usage per client (grouped by phone, since orders may be guest checkouts without a Client record)
    const usageByClientMap = new Map<string, { phone: string; name: string; count: number }>()
    for (const o of orders) {
      if (o.status === 'CANCELLED') continue
      const phone = o.guestPhone || o.client?.phone || 'Inconnu'
      const name = o.client ? `${o.client.prenom} ${o.client.nom}` : (o.guestName || 'Client Glow')
      const entry = usageByClientMap.get(phone)
      if (entry) entry.count += 1
      else usageByClientMap.set(phone, { phone, name, count: 1 })
    }
    const usageByClient = Array.from(usageByClientMap.values()).sort((a, b) => b.count - a.count)

    const orderRows = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      clientName: o.client ? `${o.client.prenom} ${o.client.nom}` : (o.guestName || 'Client Glow'),
      clientPhone: o.guestPhone || o.client?.phone || null,
      status: o.status,
      total: o.total,
      promoDiscount: o.promoDiscount,
      createdAt: o.createdAt,
    }))

    return NextResponse.json({
      promo: promoFields,
      orders: orderRows,
      stats: {
        ordersCount: orders.length,
        generatedCA,
        totalDiscountApplied,
        exhaustionRate,
        deliverySuccessRate,
        usageByClient,
      },
    })
  } catch (error: any) {
    console.error('Promo details GET error:', error)
    console.error('Promo GET error:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération du code promo' }, { status: 500 })
  }
}

import { adminPromoSchema } from '@/lib/validation'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAuth(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params
  try {
    const body = await request.json()
    const validated = adminPromoSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 })
    }

    const {
      code,
      type,
      value,
      minOrder,
      maxUses,
      maxUsesPerClient,
      applicableCategories,
      applicableProducts,
      startDate,
      endDate,
      isActive
    } = validated.data

    const current = await prisma.promoCode.findUnique({ where: { id } })
    if (!current) return NextResponse.json({ error: 'Code promo introuvable' }, { status: 404 })

    const nextValues = {
      code,
      type,
      value,
      minOrder,
      maxUses,
      maxUsesPerClient,
      applicableCategories,
      applicableProducts,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      isActive,
    }

    const changes: Record<string, { before: unknown; after: unknown }> = {}
    for (const key of Object.keys(nextValues) as (keyof typeof nextValues)[]) {
      const after = nextValues[key]
      if (after === undefined) continue
      const rawBefore = current[key as keyof typeof current]
      const before = rawBefore instanceof Date ? rawBefore.toISOString() : rawBefore
      const afterComparable = after instanceof Date ? after.toISOString() : after
      if (before !== afterComparable) changes[key] = { before, after: afterComparable }
    }

    const promo = await prisma.promoCode.update({
      where: { id },
      data: nextValues,
    })

    if (Object.keys(changes).length > 0) {
      await prisma.promoLog.create({
        data: {
          action: 'MODIFICATION',
          details: `Code promo "${promo.code}" modifié (${Object.keys(changes).join(', ')})`,
          changes: JSON.stringify(changes),
          promoId: id,
          promoCode: promo.code,
        },
      })
    }

    return NextResponse.json({ promo })
  } catch (error: any) {
    console.error('Promo update error:', error)
    console.error('Promo PUT error:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du code promo' }, { status: 500 })
  }
}

// DELETE: soft-deletes the promo code (moves it to the corbeille). Permanent deletion
// (which unlinks orders) only happens from the corbeille, via /api/admin/promo/trash.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAuth(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params
  try {
    const promo = await prisma.promoCode.findUnique({ where: { id } })
    if (!promo) return NextResponse.json({ error: 'Code promo introuvable' }, { status: 404 })

    await prisma.promoCode.update({
      where: { id },
      data: { supprime: true, supprimeLe: new Date() },
    })

    await prisma.promoLog.create({
      data: {
        action: 'SUPPRESSION',
        details: `Code promo "${promo.code}" mis à la corbeille`,
        promoId: id,
        promoCode: promo.code,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Promo delete error:', error)
    console.error('Promo DELETE error:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression du code promo' }, { status: 500 })
  }
}
