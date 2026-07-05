import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function checkAuth(request: NextRequest) {
  return checkAdminAuth(request)
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const customers = await prisma.client.findMany({
      where: { supprime: true },
      orderBy: { supprimeLe: 'desc' },
    })

    return NextResponse.json({ customers })
  } catch (error) {
    console.error('Clients trash GET error:', error)
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
      const toDelete = await prisma.client.findMany({ where: { supprime: true }, select: { id: true } })
      const idsToDelete = toDelete.map((c) => c.id)

      await prisma.order.updateMany({
        where: { clientId: { in: idsToDelete } },
        data: { clientId: null },
      })
      const deletedCount = await prisma.client.deleteMany({ where: { supprime: true } })

      await prisma.clientLog.create({
        data: {
          action: 'SUPPRESSION',
          details: `Corbeille vidée : suppression définitive de ${deletedCount.count} client(s)`,
        },
      })

      if (deletedCount.count !== idsToDelete.length) {
        console.error('Customers trash empty count mismatch:', {
          expected: idsToDelete.length,
          deleted: deletedCount.count,
        })
      }

      return NextResponse.json({ success: true, deletedCount: deletedCount.count })
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Aucun client sélectionné' }, { status: 400 })
    }

    if (action === 'restore') {
      await prisma.client.updateMany({
        where: { id: { in: ids } },
        data: { supprime: false, supprimeLe: null },
      })
      await prisma.clientLog.create({
        data: {
          action: 'RESTORATION',
          details: `Restauration de ${ids.length} client(s) depuis la corbeille`,
        },
      })
    } else if (action === 'delete') {
      await prisma.order.updateMany({
        where: { clientId: { in: ids } },
        data: { clientId: null },
      })
      const deletedCount = await prisma.client.deleteMany({ where: { id: { in: ids } } })
      if (deletedCount.count !== ids.length) {
        console.error('Customers trash delete count mismatch:', {
          expected: ids.length,
          deleted: deletedCount.count,
          ids,
        })
      }
      await prisma.clientLog.create({
        data: {
          action: 'SUPPRESSION',
          details: `Suppression définitive de ${deletedCount.count} client(s)`,
        },
      })
      return NextResponse.json({ success: true, deletedCount: deletedCount.count })
    } else {
      return NextResponse.json({ error: 'Action non supportée' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Clients trash POST error:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'opération' }, { status: 500 })
  }
}
