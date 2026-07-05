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
    const { searchParams } = new URL(request.url)
    const filterEmpty = searchParams.get('filterEmpty') === 'true'

    const whereClause: any = {}
    if (filterEmpty) {
      whereClause.products = {
        some: {
          supprime: false
        }
      }
    }

    const categories = await prisma.category.findMany({
      where: whereClause,
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { products: true } },
        parent: { select: { name: true } },
      },
    })
    return NextResponse.json({ categories })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  try {
    const body = await request.json()
    const { name, nameAr, nameEn, slug, image, order, parentId, isActive } = body
    if (!name || !slug) return NextResponse.json({ error: 'Nom et slug requis' }, { status: 400 })
    const category = await prisma.category.create({
      data: {
        name, nameAr: nameAr || null, nameEn: nameEn || null,
        slug, image: image || null,
        order: parseInt(order) || 0,
        parentId: parentId || null,
        isActive: isActive !== false,
      },
    })
    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
  }
}
