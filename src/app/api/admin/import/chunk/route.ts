import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'
import {
  processImportBatch,
  type ImportMapping,
  type ImportOptions,
  type ImportDbSettings,
} from '@/lib/importProcessor'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_ROWS_PER_REQUEST = 250

type ChunkBody = {
  batchId?: string
  rows?: Record<string, unknown>[]
  mapping?: ImportMapping
  options?: ImportOptions
  rowOffset?: number
  isFirst?: boolean
  isLast?: boolean
}

async function loadImportSettings(): Promise<ImportDbSettings> {
  const defaults: ImportDbSettings = {
    duplicateBehavior: 'update',
    normaliseCategories: true,
    defaultStatus: 'inactive',
  }

  try {
    const settingRow = await prisma.setting.findUnique({ where: { key: 'import' } })
    if (!settingRow) return defaults

    const parsed = JSON.parse(settingRow.value) as Partial<ImportDbSettings>
    return {
      duplicateBehavior: parsed.duplicateBehavior || defaults.duplicateBehavior,
      normaliseCategories: parsed.normaliseCategories ?? defaults.normaliseCategories,
      defaultStatus: parsed.defaultStatus || defaults.defaultStatus,
    }
  } catch {
    return defaults
  }
}

export async function POST(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json() as ChunkBody
    const batchId = String(body.batchId || '')
    const rows = Array.isArray(body.rows) ? body.rows : []
    const rowOffset = Math.max(0, Number(body.rowOffset) || 0)
    const isFirst = body.isFirst === true
    const isLast = body.isLast === true

    if (!batchId || rows.length === 0) {
      return NextResponse.json({ error: 'Lot ou données manquants' }, { status: 400 })
    }

    if (rows.length > MAX_ROWS_PER_REQUEST) {
      return NextResponse.json({ error: `Lot trop grand. Maximum ${MAX_ROWS_PER_REQUEST} lignes par requête.` }, { status: 400 })
    }

    const batch = await prisma.importBatch.findUnique({ where: { id: batchId } })
    if (!batch) {
      return NextResponse.json({ error: 'Session d’importation introuvable' }, { status: 404 })
    }

    if (rowOffset + rows.length > batch.totalRows) {
      return NextResponse.json({ error: 'Ce lot dépasse le nombre total de lignes déclaré' }, { status: 400 })
    }

    // Idempotency: if a retry arrives after the previous request was actually
    // committed, return the current state instead of importing the same rows twice.
    if (batch.processedRows >= rowOffset + rows.length) {
      let existingErrors: string[] = []
      try {
        existingErrors = batch.errorsJson ? JSON.parse(batch.errorsJson) : []
      } catch {
        existingErrors = []
      }
      return NextResponse.json({
        success: true,
        replayed: true,
        batch: { ...batch, errors: existingErrors },
      })
    }

    if (batch.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Cette importation est déjà terminée' }, { status: 409 })
    }

    if (batch.status === 'FAILED') {
      return NextResponse.json({ error: batch.errorMessage || 'Cette importation a échoué' }, { status: 409 })
    }

    if (batch.processedRows !== rowOffset) {
      return NextResponse.json({
        error: `Lot reçu dans le désordre. Prochaine ligne attendue: ${batch.processedRows + 1}.`,
      }, { status: 409 })
    }

    const dbSettings = await loadImportSettings()

    await processImportBatch(
      batchId,
      rows,
      body.mapping || {},
      body.options || {},
      dbSettings,
      undefined,
      {
        initialize: isFirst,
        finalize: isLast,
        rowOffset,
      }
    )

    const updated = await prisma.importBatch.findUnique({ where: { id: batchId } })
    if (!updated) {
      return NextResponse.json({ error: 'Session d’importation introuvable après traitement' }, { status: 404 })
    }

    let errors: string[] = []
    try {
      errors = updated.errorsJson ? JSON.parse(updated.errorsJson) : []
    } catch {
      errors = []
    }

    return NextResponse.json({
      success: true,
      batch: { ...updated, errors },
    })
  } catch (error) {
    console.error('[Import chunk error]', error)
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ error: `Erreur de traitement du lot : ${message}` }, { status: 500 })
  }
}
