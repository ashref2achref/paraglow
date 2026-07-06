import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function checkAuth(request: NextRequest) {
  return await checkAdminAuth(request);}

export async function POST(request: NextRequest) {
  if (!(await checkAuth(request))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const { ids, action, categoryId } = await request.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Aucun produit sélectionné' }, { status: 400 })
    }

    if (action === 'trash') {
      // Soft delete
      await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { supprime: true, supprimeLe: new Date() },
      })
      await prisma.productLog.create({
        data: {
          action: 'SUPPRESSION',
          details: `Mise en corbeille de ${ids.length} produit(s)`,
        },
      })
    } else if (action === 'activate') {
      await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { isActive: true },
      })
      await prisma.productLog.create({
        data: {
          action: 'MODIFICATION',
          details: `Activation en masse de ${ids.length} produit(s)`,
        },
      })
    } else if (action === 'deactivate') {
      await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { isActive: false },
      })
      await prisma.productLog.create({
        data: {
          action: 'MODIFICATION',
          details: `Désactivation en masse de ${ids.length} produit(s)`,
        },
      })
    } else if (action === 'category') {
      if (!categoryId) {
        return NextResponse.json({ error: 'Catégorie manquante' }, { status: 400 })
      }
      await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { categoryId },
      })
      const cat = await prisma.category.findUnique({ where: { id: categoryId } })
      await prisma.productLog.create({
        data: {
          action: 'MODIFICATION',
          details: `Changement de catégorie en masse pour ${ids.length} produit(s) vers : ${cat?.name || 'Aucune'}`,
        },
      })
    } else {
      return NextResponse.json({ error: 'Action non supportée' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Bulk action error:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'action groupée' }, { status: 500 })
  }
}
