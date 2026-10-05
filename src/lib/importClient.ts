'use client'

export const MAX_CLIENT_IMPORT_FILE_MB = 100
export const MAX_CLIENT_IMPORT_ROWS = 100_000
export const CLIENT_IMPORT_CHUNK_SIZE = 40
export const CLIENT_IMPORT_IMAGE_CHUNK_SIZE = 20

export interface ParsedImportFile {
  sheets: string[]
  sheetName: string
  headers: string[]
  rows: Record<string, unknown>[]
  embeddedImagesDetected: boolean
}

function serializableCell(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (value === null || value === undefined) return ''
  return value
}

// Embedded-image inspection used to run ExcelJS here and blocked the whole wizard.
 // Some valid workbooks (including the current catalogue) are rejected by ExcelJS,
 // so client-side preview must never wait for this optional capability.
export async function parseImportFile(file: File, selectedSheet = ''): Promise<ParsedImportFile> {
  const lowerName = file.name.toLowerCase()

  if (lowerName.endsWith('.xlsx')) {
    const { default: readExcelFile } = await import('read-excel-file/browser')
    const workbookSheets = await readExcelFile(file)

    if (!Array.isArray(workbookSheets) || workbookSheets.length === 0) {
      throw new Error('Le fichier Excel ne contient aucune feuille lisible')
    }

    const sheets = workbookSheets.map((sheet) => sheet.sheet)
    const sheetName =
      selectedSheet ||
      sheets.find((name) => name.toLowerCase() === 'articles') ||
      sheets.find((name) => name.toLowerCase() === 'sheet') ||
      sheets[0]

    const selected = workbookSheets.find((sheet) => sheet.sheet === sheetName)
    if (!selected) throw new Error('Feuille Excel introuvable')

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
    }

    return {
      sheets,
      sheetName,
      headers: columns.map((column) => column.name),
      rows,
      embeddedImagesDetected: false,
    }
  }

  if (lowerName.endsWith('.csv')) {
    const { parse: parseCsv } = await import('csv-parse/browser/esm/sync')
    const rows = parseCsv(await file.text(), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    }) as Record<string, unknown>[]

    return {
      sheets: ['CSV'],
      sheetName: 'CSV',
      headers: rows[0] ? Object.keys(rows[0]) : [],
      rows,
      embeddedImagesDetected: false,
    }
  }

  throw new Error('Format non supporté (utilisez .xlsx ou .csv)')
}
