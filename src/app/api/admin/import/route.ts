import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'
import { MAX_IMPORT_ROWS, processImportBatch, type ImportMapping, type ImportOptions } from '@/lib/importProcessor'
import { extractEmbeddedImagesByRow, hasEmbeddedImages } from '@/lib/excelImageExtractor'

export const dynamic = 'force-dynamic'

function checkAuth(request: NextRequest) {
  return checkAdminAuth(request)
}

// POST: Importer le fichier.
// - previewOnly=true: parses the file and returns headers/sample rows only (unchanged).
// - real run: creates the ImportBatch immediately (status PENDING) and schedules the
//   actual processing via next/server's `after()`, then returns right away with the
//   batch id. The client polls GET /api/admin/import/batches/[id] for real progress
//   instead of the old client-side animated fake bar. This is robust regardless of
//   hosting: on a persistent self-hosted Node process (what this app's SQLite/better-sqlite3
//   setup requires anyway — SQLite needs a long-lived process with filesystem access,
//   which rules out typical serverless/edge deployment) the work simply continues after
//   the response is flushed; on platforms that support it, `after()` explicitly extends
//   the function's lifetime for this exact purpose. This avoids ever blocking the HTTP
//   request past Next.js's default route timeout, and gives honest progress feedback.
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const previewOnly = formData.get('previewOnly') === 'true'
    const mappingStr = formData.get('mapping') as string
    const optionsStr = formData.get('options') as string
    const selectedSheet = formData.get('selectedSheet') as string

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileName = file.name.toLowerCase()

    // 1. File size validation (server-side, e.g. 20MB)
    const MAX_FILE_SIZE_MB = 20
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({
        error: `Le fichier est trop volumineux (max ${MAX_FILE_SIZE_MB} Mo).`
      }, { status: 400 })
    }

    // 2. Binary signature validation (magic bytes)
    if (fileName.endsWith('.xlsx')) {
      if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4B || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
        return NextResponse.json({ error: 'Le fichier n\'est pas un document Excel (.xlsx) valide (signature binaire incorrecte).' }, { status: 400 })
      }
    } else if (fileName.endsWith('.xls')) {
      if (buffer.length < 8 ||
          buffer[0] !== 0xD0 || buffer[1] !== 0xCF || buffer[2] !== 0x11 || buffer[3] !== 0xE0 ||
          buffer[4] !== 0xA1 || buffer[5] !== 0xB1 || buffer[6] !== 0x1A || buffer[7] !== 0xE1) {
        return NextResponse.json({ error: 'Le fichier n\'est pas un document Excel (.xls) valide (signature binaire incorrecte).' }, { status: 400 })
      }
    }

    let sheets: string[] = []
    let activeSheetData: Record<string, unknown>[] = []
    let resolvedSheetName = ''
    const isSpreadsheet = fileName.endsWith('.xlsx') || fileName.endsWith('.xls')

    // Parse Excel or CSV
    if (isSpreadsheet) {
      const XLSX = require('xlsx')
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      sheets = workbook.SheetNames

      let sheetName = selectedSheet || ''
      if (!sheetName) {
        sheetName = sheets.find((n: string) => n.toLowerCase() === 'sheet') ||
                    sheets.find((n: string) => n.toLowerCase() !== 'feuil1') ||
                    sheets[0]
      }
      resolvedSheetName = sheetName

      const sheet = workbook.Sheets[sheetName]
      activeSheetData = XLSX.utils.sheet_to_json(sheet, { defval: '' })
    } else if (fileName.endsWith('.csv')) {
      const text = buffer.toString('utf-8')
      const { parse } = require('csv-parse/sync')
      activeSheetData = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      })
      sheets = ['CSV']
    } else {
      return NextResponse.json({ error: 'Format non supporté (utilisez .xlsx, .xls ou .csv)' }, { status: 400 })
    }

    if (activeSheetData.length === 0) {
      return NextResponse.json({ error: 'Le fichier ne contient aucune ligne de données' }, { status: 400 })
    }

    if (activeSheetData.length > MAX_IMPORT_ROWS) {
      return NextResponse.json({
        error: `Ce fichier contient ${activeSheetData.length} lignes, au-delà de la limite acceptée de ${MAX_IMPORT_ROWS.toLocaleString('fr-FR')} lignes par import. Scindez le fichier en plusieurs fichiers plus petits.`,
      }, { status: 400 })
    }

    const headers = Object.keys(activeSheetData[0])

    if (previewOnly) {
      const embeddedImagesDetected = isSpreadsheet
        ? await hasEmbeddedImages(buffer, resolvedSheetName)
        : false

      return NextResponse.json({
        sheets,
        headers,
        previewRows: activeSheetData.slice(0, 10),
        totalRows: activeSheetData.length,
        embeddedImagesDetected,
      })
    }

    // Load import settings from DB
    let dbDuplicateBehavior = 'update'
    let dbNormaliseCategories = true
    let dbDefaultStatus = 'inactive'
    try {
      const settingRow = await prisma.setting.findUnique({ where: { key: 'import' } })
      if (settingRow) {
        const parsed = JSON.parse(settingRow.value)
        if (parsed.duplicateBehavior) dbDuplicateBehavior = parsed.duplicateBehavior
        if (parsed.normaliseCategories !== undefined) dbNormaliseCategories = parsed.normaliseCategories
        if (parsed.defaultStatus) dbDefaultStatus = parsed.defaultStatus
      }
    } catch { /* use defaults */ }

    const mapping = JSON.parse(mappingStr || '{}') as ImportMapping
    const options = JSON.parse(optionsStr || '{}') as ImportOptions

    // Two mutually exclusive image sources: an "URL image" column (handled per-row by
    // the processor itself) takes priority if mapped; otherwise, if the workbook has
    // natively embedded images, extract them up front and match them by anchor row —
    // this has to happen here (we still have the raw buffer) rather than inside the
    // processor, which only receives already-parsed row objects.
    let embeddedImagesByRow: Map<number, Buffer> | undefined
    if (!mapping.imageUrl && isSpreadsheet) {
      embeddedImagesByRow = await extractEmbeddedImagesByRow(buffer, resolvedSheetName)
      if (embeddedImagesByRow.size === 0) embeddedImagesByRow = undefined
    }

    const batch = await prisma.importBatch.create({
      data: {
        filename: file.name,
        status: 'PENDING',
        totalRows: activeSheetData.length,
        processedRows: 0,
      },
    })

    const dbSettings = {
      duplicateBehavior: dbDuplicateBehavior,
      normaliseCategories: dbNormaliseCategories,
      defaultStatus: dbDefaultStatus,
    }

    after(() => processImportBatch(batch.id, activeSheetData, mapping, options, dbSettings, embeddedImagesByRow))

    return NextResponse.json({ success: true, async: true, batchId: batch.id }, { status: 202 })
  } catch (error: any) {
    console.error('Import POST error:', error)
    return NextResponse.json({ error: error.message || 'Erreur lors de l\'import' }, { status: 500 })
  }
}
