import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'
import { MAX_IMPORT_ROWS } from '@/lib/importProcessor'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json() as { filename?: string; totalRows?: number }
    const filename = String(body.filename || '').trim().slice(0, 255)
    const totalRows = Number(body.totalRows)

    if (!filename) {
      return NextResponse.json({ error: 'Nom de fichier invalide' }, { status: 400 })
    }

    if (!Number.isInteger(totalRows) || totalRows < 1 || totalRows > MAX_IMPORT_ROWS) {
      return NextResponse.json({
        error: `Nombre de lignes invalide. Maximum: ${MAX_IMPORT_ROWS.toLocaleString('fr-FR')} lignes.`,
      }, { status: 400 })
    }

    const batch = await prisma.importBatch.create({
      data: {
        filename,
        status: 'PENDING',
        totalRows,
        processedRows: 0,
      },
    })

    return NextResponse.json({ batchId: batch.id, totalRows: batch.totalRows }, { status: 201 })
  } catch (error) {
    console.error('[Import session create error]', error)
    return NextResponse.json({ error: 'Impossible de préparer la session d’importation' }, { status: 500 })
  }
}
