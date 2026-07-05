import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

function checkAuth(request: NextRequest) {
  return checkAdminAuth(request)
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit
  const status = searchParams.get('status') || 'all' // 'all', 'unread', 'read'

  const where: Prisma.ContactMessageWhereInput = {}
  if (status === 'unread') where.isRead = false
  if (status === 'read') where.isRead = true

  try {
    const [messages, total, unreadCount] = await Promise.all([
      prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.contactMessage.count({ where }),
      prisma.contactMessage.count({ where: { isRead: false } }),
    ])

    return NextResponse.json({
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    })
  } catch (error) {
    console.error('Admin messages GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
