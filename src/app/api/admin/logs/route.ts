import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function checkAuth(request: NextRequest) {
  return await checkAdminAuth(request);}

export async function GET(request: NextRequest) {
  if (!(await checkAuth(request))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const skip = (page - 1) * limit
  const action = searchParams.get('action') || ''
  const search = searchParams.get('search') || ''

  const where: Record<string, any> = {}

  if (action) {
    where.action = action
  }

  if (search) {
    where.OR = [
      { details: { contains: search } },
      { productName: { contains: search } },
      { productId: { contains: search } },
    ]
  }

  try {
    const [logs, total] = await Promise.all([
      prisma.productLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.productLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Logs GET error:', error)
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

    const result = await prisma.productLog.deleteMany({
      where,
    })

    return NextResponse.json({ deletedCount: result.count })
  } catch (error) {
    console.error('Logs DELETE error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

