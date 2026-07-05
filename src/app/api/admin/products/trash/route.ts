import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'
import { purgeOrphans } from '@/lib/purgeOrphans'

export const dynamic = 'force-dynamic'

function checkAuth(request: NextRequest) {
  return checkAdminAuth(request)
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const products = await prisma.product.findMany({
      where: { supprime: true },
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
      },
      orderBy: { supprimeLe: 'desc' },
    })

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Trash GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const { ids, action } = await request.json()

    if (action === 'empty') {
      const trashedProducts = await prisma.product.findMany({
        where: { supprime: true },
        select: { id: true }
      })
      const idsToDelete = trashedProducts.map((p) => p.id)

      if (idsToDelete.length > 0) {
        const orderedCount = await prisma.orderItem.count({
          where: { productId: { in: idsToDelete } }
        })
        if (orderedCount > 0) {
          return NextResponse.json({
            error: `La corbeille ne peut pas être entièrement vidée car certains produits ont déjà été commandés. Veuillez les supprimer individuellement.`
          }, { status: 400 })
        }
      }

      const deletedCount = await prisma.product.deleteMany({
        where: { supprime: true },
      })
      await prisma.productLog.create({
        data: {
          action: 'SUPPRESSION',
          details: `Corbeille vidée : suppression définitive de ${deletedCount.count} produit(s)`,
        },
      })
      
      // Auto-purge orphan categories/brands
      await purgeOrphans()

      if (deletedCount.count !== idsToDelete.length) {
        console.error('Products trash empty count mismatch:', {
          expected: idsToDelete.length,
          deleted: deletedCount.count,
        })
      }

      return NextResponse.json({ success: true, deletedCount: deletedCount.count })
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Aucun produit sélectionné' }, { status: 400 })
    }

    if (action === 'restore') {
      await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { supprime: false, supprimeLe: null },
      })
      await prisma.productLog.create({
        data: {
          action: 'RESTORATION',
          details: `Restauration de ${ids.length} produit(s) depuis la corbeille`,
        },
      })
    } else if (action === 'delete') {
      // Check if any targeted product has been ordered
      const orderedCount = await prisma.orderItem.count({
        where: { productId: { in: ids } }
      })
      if (orderedCount > 0) {
        const orderedItems = await prisma.orderItem.findMany({
          where: { productId: { in: ids } },
          select: { productId: true }
        })
        const distinctOrderedIds = Array.from(new Set(orderedItems.map(item => item.productId)))

        if (ids.length === 1) {
          const prod = await prisma.product.findUnique({ where: { id: ids[0] }, select: { name: true } })
          return NextResponse.json({
            error: `Le produit "${prod?.name || 'sélectionné'}" ne peut pas être supprimé définitivement car il est lié à ${orderedCount} commande(s) existante(s). Il restera dans la corbeille pour préserver l'historique des ventes.`
          }, { status: 400 })
        } else {
          return NextResponse.json({
            error: `${distinctOrderedIds.length} produit(s) sélectionné(s) ne peu(ven)t pas être supprimé(s) définitivement car ils sont liés à des commandes existantes (${orderedCount} commande(s) au total).`
          }, { status: 400 })
        }
      }

      const deletedCount = await prisma.product.deleteMany({
        where: { id: { in: ids } },
      })
      if (deletedCount.count !== ids.length) {
        console.error('Products trash delete count mismatch:', {
          expected: ids.length,
          deleted: deletedCount.count,
          ids,
        })
      }
      await prisma.productLog.create({
        data: {
          action: 'SUPPRESSION',
          details: `Suppression définitive de ${deletedCount.count} produit(s)`,
        },
      })

      // Auto-purge orphan categories/brands
      await purgeOrphans()
      return NextResponse.json({ success: true, deletedCount: deletedCount.count })
    } else {
      return NextResponse.json({ error: 'Action non supportée' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Trash POST error:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'opération' }, { status: 500 })
  }
}
