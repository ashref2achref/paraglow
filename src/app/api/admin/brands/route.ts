import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function checkAuth(request: NextRequest) {
  return await checkAdminAuth(request);}

export async function GET(request: NextRequest) {
  if (!(await checkAuth(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
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

    const brands = await prisma.brand.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    })
    return NextResponse.json({ brands })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!(await checkAuth(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  try {
    const body = await request.json()
    const { name, slug, logo, description, isActive, order } = body
    if (!name || !slug) return NextResponse.json({ error: 'Nom et slug requis' }, { status: 400 })
    const brand = await prisma.brand.create({
      data: {
        name, slug,
        logo: logo || null,
        description: description || null,
        isActive: isActive !== false,
        order: parseInt(order) || 0,
      },
    })
    return NextResponse.json({ brand }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur création' }, { status: 500 })
  }
}
