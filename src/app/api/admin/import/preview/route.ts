import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import readExcelFile from 'read-excel-file/node'
import { parse as parseCsv } from 'csv-parse/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const MAX_PREVIEW_FILE_BYTES = 4 * 1024 * 1024
const MAX_PREVIEW_ROWS = 100_000

function serializableCell(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (value === null || value === undefined) return ''
  return value
}

export async function POST(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const selectedSheet = String(formData.get('selectedSheet') || '').trim()

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
    }

    if (file.size > MAX_PREVIEW_FILE_BYTES) {
      return NextResponse.json(
        { error: 'preview_too_large', maxBytes: MAX_PREVIEW_FILE_BYTES },
        { status: 413 }
      )
    }

    const filename = file.name.toLowerCase()
    const buffer = Buffer.from(await file.arrayBuffer())

    if (filename.endsWith('.csv')) {
      const rows = parseCsv(buffer.toString('utf-8'), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      }) as Record<string, unknown>[]

      if (rows.length === 0) {
        return NextResponse.json({ error: 'Le fichier ne contient aucune ligne de données' }, { status: 400 })
      }
      if (rows.length > MAX_PREVIEW_ROWS) {
        return NextResponse.json({ error: 'Trop de lignes dans ce fichier' }, { status: 400 })
      }

      return NextResponse.json({
        sheets: ['CSV'],
        sheetName: 'CSV',
        headers: Object.keys(rows[0] || {}),
        rows,
        totalRows: rows.length,
        embeddedImagesDetected: false,
      })
    }

    if (!filename.endsWith('.xlsx')) {
      return NextResponse.json({ error: 'Format non supporté (utilisez .xlsx ou .csv)' }, { status: 400 })
    }

    if (
      buffer.length < 4 ||
      buffer[0] !== 0x50 ||
      buffer[1] !== 0x4b ||
      buffer[2] !== 0x03 ||
      buffer[3] !== 0x04
    ) {
      return NextResponse.json({ error: 'Le fichier .xlsx est invalide' }, { status: 400 })
    }

    const workbookSheets = await readExcelFile(buffer)
    if (!Array.isArray(workbookSheets) || workbookSheets.length === 0) {
      return NextResponse.json({ error: 'Aucune feuille Excel lisible' }, { status: 400 })
    }

    const sheetNames = workbookSheets.map((sheet) => sheet.sheet)
    const sheetName =
      selectedSheet ||
      sheetNames.find((name) => name.toLowerCase() === 'articles') ||
      sheetNames.find((name) => name.toLowerCase() === 'sheet') ||
      sheetNames[0]

    const selected = workbookSheets.find((sheet) => sheet.sheet === sheetName)
    if (!selected) {
      return NextResponse.json({ error: 'Feuille Excel introuvable' }, { status: 400 })
    }

    const matrix = selected.data
    const headerRow = matrix[0] || []
    const columns = headerRow
      .map((value, index) => ({ name: String(value ?? '').trim(), index }))
      .filter((column) => column.name.length > 0)

    const rows: Record<string, unknown>[] = []
    for (const sourceRow of matrix.slice(1)) {
      const row: Record<string, unknown> = {}
      let hasData = false

      for (const column of columns) {
        const value = serializableCell(sourceRow[column.index])
        row[column.name] = value
        if (value !== '' && value !== null && value !== undefined) hasData = true
      }

      if (hasData) rows.push(row)
      if (rows.length > MAX_PREVIEW_ROWS) {
        return NextResponse.json({ error: 'Trop de lignes dans ce fichier' }, { status: 400 })
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Le fichier ne contient aucune ligne de données' }, { status: 400 })
    }

    return NextResponse.json({
      sheets: sheetNames,
      sheetName,
      headers: columns.map((column) => column.name),
      rows,
      totalRows: rows.length,
      embeddedImagesDetected: false,
    })
  } catch (error) {
    console.error('[Import preview error]', error)
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ error: 'Analyse du fichier impossible : ' + message }, { status: 500 })
  }
}
