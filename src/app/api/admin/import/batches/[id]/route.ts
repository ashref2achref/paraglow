import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'
import { revalidateAllLocales } from '@/lib/revalidate'
import { purgeOrphans } from '@/lib/purgeOrphans'

export const dynamic = 'force-dynamic'

// SQLite rejects a single query with too many bound parameters. An `IN (...)` clause
// binds one parameter per id, so a batch import large enough to create tens of
// thousands of products (exactly what Chantier 7A enables) can exceed that limit when
// undoing the whole import at once. Chunking keeps every individual query well under it.
const ID_CHUNK_SIZE = 500

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

async function checkAuth(request: NextRequest) {
  return await checkAdminAuth(request);}

// GET: poll the live status of an import batch (used by the wizard's progress step
// instead of a fake animated bar, since the actual processing runs in the background).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAuth(request))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params

  try {
    const batch = await prisma.importBatch.findUnique({ where: { id } })
    if (!batch) {
      return NextResponse.json({ error: 'Lot d\'importation introuvable' }, { status: 404 })
    }

    let errors: string[] = []
    try {
      errors = batch.errorsJson ? JSON.parse(batch.errorsJson) : []
    } catch { /* ignore malformed errorsJson */ }

    return NextResponse.json({ batch: { ...batch, errors } })
  } catch (error) {
    console.error('Import batch status GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAuth(request))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params
  const { searchParams } = request.nextUrl
  const mode = searchParams.get('mode') || 'trash' // 'trash' or 'permanent'

  try {
    const batch = await prisma.importBatch.findUnique({
      where: { id },
      include: { products: { select: { id: true } } },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Lot d\'importation introuvable' }, { status: 404 })
    }

    const productIds = batch.products.map((p) => p.id)
    const idChunks = chunk(productIds, ID_CHUNK_SIZE)

    if (mode !== 'trash' && mode !== 'permanent') {
      return NextResponse.json({ error: 'Mode de suppression non supporté' }, { status: 400 })
    }

    if (mode === 'permanent' && productIds.length > 0) {
      let orderedItemsCount = 0
      for (const idsChunk of idChunks) {
        orderedItemsCount += await prisma.orderItem.count({
          where: { productId: { in: idsChunk } }
        })
      }

      if (orderedItemsCount > 0) {
        return NextResponse.json({
          error: 'Certains produits créés par cet import ont déjà été commandés et ne peuvent pas être supprimés définitivement. Veuillez les mettre en corbeille.'
        }, { status: 400 })
      }
    }

    await prisma.$transaction(async (tx) => {
      if (productIds.length > 0) {
        if (mode === 'permanent') {
          for (const idsChunk of idChunks) {
            await tx.review.deleteMany({ where: { productId: { in: idsChunk } } })
            await tx.product.deleteMany({ where: { id: { in: idsChunk } } })
          }
        } else {
          for (const idsChunk of idChunks) {
            await tx.product.updateMany({
              where: { id: { in: idsChunk } },
              data: {
                supprime: true,
                supprimeLe: new Date(),
              },
            })
          }
        }
      }

      await tx.productLog.create({
        data: {
          action: mode === 'permanent' ? 'SUPPRESSION' : 'MODIFICATION',
          details: `${mode === 'permanent' ? 'Suppression définitive' : 'Mise en corbeille'} de ${productIds.length} produits du lot d'importation "${batch.filename}"`,
        },
      })

      await tx.importBatch.delete({
        where: { id },
      })
    })

    if (mode === 'permanent' && productIds.length > 0) {
      await purgeOrphans()
    }

    // Revalidate public caches
    try {
      revalidateAllLocales('/produits')
      revalidateAllLocales('/')
    } catch { /* ignore */ }

    return NextResponse.json({ success: true, count: productIds.length })
  } catch (error) {
    console.error('Delete import batch error:', error)
    return NextResponse.json({ error: 'Erreur serveur lors de la suppression de l\'import' }, { status: 500 })
  }
}
