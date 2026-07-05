import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function checkAuth(request: NextRequest) {
  return checkAdminAuth(request)
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  try {
    const promos = await prisma.promoCode.findMany({
      where: { supprime: false },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { orders: true } },
        orders: { select: { total: true, promoDiscount: true } }
      }
    })

    // Calculate usage statistics per promo code
    const promosWithStats = promos.map(p => {
      const generatedCA = p.orders.reduce((sum, o) => sum + o.total, 0)
      const totalDiscountApplied = p.orders.reduce((sum, o) => sum + o.promoDiscount, 0)
      return {
        ...p,
        generatedCA,
        totalDiscountApplied,
        usageCount: p._count.orders
      }
    })

    return NextResponse.json({ promos: promosWithStats })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  try {
    const body = await request.json()
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
    } = body

    if (!code || value === undefined) {
      return NextResponse.json({ error: 'Code et valeur requis' }, { status: 400 })
    }

    // Check if code already exists
    const uppercaseCode = code.toUpperCase().trim()
    const existing = await prisma.promoCode.findUnique({ where: { code: uppercaseCode } })
    if (existing) {
      return NextResponse.json({ error: 'Ce code promo existe déjà' }, { status: 400 })
    }

    const promo = await prisma.promoCode.create({
      data: {
        code: uppercaseCode,
        type: type || 'PERCENTAGE',
        value: parseFloat(String(value)),
        minOrder: minOrder ? parseFloat(String(minOrder)) : null,
        maxUses: maxUses ? parseInt(String(maxUses)) : null,
        maxUsesPerClient: maxUsesPerClient ? parseInt(String(maxUsesPerClient)) : null,
        applicableCategories: applicableCategories ? String(applicableCategories) : null,
        applicableProducts: applicableProducts ? String(applicableProducts) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isActive: isActive !== false,
      },
    })

    await prisma.promoLog.create({
      data: {
        action: 'CREATION',
        details: `Code promo "${promo.code}" créé`,
        promoId: promo.id,
        promoCode: promo.code,
      },
    })

    return NextResponse.json({ promo }, { status: 201 })
  } catch (error: any) {
    console.error('Promo code creation error:', error)
    return NextResponse.json({ error: error.message || 'Erreur création' }, { status: 500 })
  }
}
