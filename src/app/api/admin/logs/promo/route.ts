import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function checkAuth(request: NextRequest) {
  return await checkAdminAuth(request);}

export async function GET(request: NextRequest) {
  if (!(await checkAuth(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const skip = (page - 1) * limit
  const promoId = searchParams.get('promoId') || ''

  try {
    const where: any = {}
    if (promoId) where.promoId = promoId

    const [logs, total] = await Promise.all([
      prisma.promoLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.promoLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Promo logs GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await checkAuth(request))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    let olderThanDays: number | undefined
    try {
      const body = await request.json()
      olderThanDays = body.olderThanDays
    } catch {
      // ignore empty body
    }

    const where: Record<string, any> = {}
    if (olderThanDays !== undefined && typeof olderThanDays === 'number' && !isNaN(olderThanDays)) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
      where.createdAt = { lt: cutoffDate }
    }

    const result = await prisma.promoLog.deleteMany({
      where,
    })

    return NextResponse.json({ deletedCount: result.count })
  } catch (error) {
    console.error('Promo logs DELETE error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

