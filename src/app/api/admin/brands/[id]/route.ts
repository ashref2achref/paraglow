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
    const { name, slug, logo, description, isActive, order } = body
    const brand = await prisma.brand.update({
      where: { id },
      data: { name, slug, logo: logo || null, description: description || null, isActive: isActive !== false, order: parseInt(order) || 0 },
    })
    return NextResponse.json({ brand })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params
  try {
    await prisma.brand.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur suppression' }, { status: 500 })
  }
}
