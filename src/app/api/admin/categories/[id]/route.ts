import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function checkAuth(request: NextRequest) {
  return checkAdminAuth(request)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params
  try {
    const body = await request.json()
    const { name, nameAr, nameEn, slug, image, order, parentId, isActive } = body
    const category = await prisma.category.update({
      where: { id },
      data: {
        name, nameAr: nameAr || null, nameEn: nameEn || null,
        slug, image: image || null,
        order: parseInt(order) || 0,
        parentId: parentId || null,
        isActive: isActive !== false,
      },
    })
    return NextResponse.json({ category })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params
  try {
    await prisma.category.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur suppression' }, { status: 500 })
  }
}
