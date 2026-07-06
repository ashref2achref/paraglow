import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function checkAuth(request: NextRequest) {
  return await checkAdminAuth(request);}

export async function GET(request: NextRequest) {
  if (!(await checkAuth(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const promos = await prisma.promoCode.findMany({
      where: { supprime: true },
      orderBy: { supprimeLe: 'desc' },
    })
    return NextResponse.json({ promos })
  } catch (error) {
    console.error('Promo trash GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!(await checkAuth(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const { ids, action } = await request.json()

    if (action === 'empty') {
      const toDelete = await prisma.promoCode.findMany({ where: { supprime: true }, select: { id: true } })
      const idsToDelete = toDelete.map((p) => p.id)

      await prisma.order.updateMany({
        where: { promoCodeId: { in: idsToDelete } },
        data: { promoCodeId: null },
      })
      const deletedCount = await prisma.promoCode.deleteMany({ where: { supprime: true } })

      await prisma.promoLog.create({
        data: {
          action: 'SUPPRESSION',
          details: `Corbeille vidée : suppression définitive de ${deletedCount.count} code(s) promo`,
        },
      })

      if (deletedCount.count !== idsToDelete.length) {
        console.error('Promo trash empty count mismatch:', {
          expected: idsToDelete.length,
          deleted: deletedCount.count,
        })
      }

      return NextResponse.json({ success: true, deletedCount: deletedCount.count })
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Aucun code promo sélectionné' }, { status: 400 })
    }

    if (action === 'restore') {
      await prisma.promoCode.updateMany({
        where: { id: { in: ids } },
        data: { supprime: false, supprimeLe: null },
      })
      await prisma.promoLog.create({
        data: {
          action: 'RESTORATION',
          details: `Restauration de ${ids.length} code(s) promo depuis la corbeille`,
        },
      })
    } else if (action === 'delete') {
      await prisma.order.updateMany({
        where: { promoCodeId: { in: ids } },
        data: { promoCodeId: null },
      })
      const deletedCount = await prisma.promoCode.deleteMany({ where: { id: { in: ids } } })
      if (deletedCount.count !== ids.length) {
        console.error('Promo trash delete count mismatch:', {
          expected: ids.length,
          deleted: deletedCount.count,
          ids,
        })
      }
      await prisma.promoLog.create({
        data: {
          action: 'SUPPRESSION',
          details: `Suppression définitive de ${deletedCount.count} code(s) promo`,
        },
      })
      return NextResponse.json({ success: true, deletedCount: deletedCount.count })
    } else {
      return NextResponse.json({ error: 'Action non supportée' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Promo trash POST error:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'opération' }, { status: 500 })
  }
}
