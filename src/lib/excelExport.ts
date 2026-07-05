import ExcelJS from 'exceljs'

export interface ExcelColumn {
  header: string
  key: string
  width?: number
  numFmt?: string
}

export interface ExcelSheet {
  name: string
  columns: ExcelColumn[]
  rows: any[]
}

export async function exportToExcel({
  filename,
  sheets,
}: {
  filename: string
  sheets: ExcelSheet[]
}) {
  const workbook = new ExcelJS.Workbook()

  sheets.forEach((sheetData) => {
    const worksheet = workbook.addWorksheet(sheetData.name, {
      views: [{ state: 'frozen', ySplit: 1 }],
      properties: { defaultRowHeight: 20 },
    })

    // Add columns
    worksheet.columns = sheetData.columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width || 15,
    }))

    // Style Header Row
    const headerRow = worksheet.getRow(1)
    headerRow.height = 28
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF153F2B' }, // Forest green
      }
      cell.font = {
        name: 'Segoe UI',
        bold: true,
        color: { argb: 'FFF5EFE0' }, // Off white / Cream text
        size: 11,
      }
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'left',
      }
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FFC9A052' } }, // Golden border bottom
      }
    })

    // Add rows
    sheetData.rows.forEach((rowData, rIdx) => {
      const row = worksheet.addRow(rowData)
      row.height = 20

      // Alternating row background (cream alternating with white)
      const isEven = rIdx % 2 === 0
      const rowBgColor = isEven ? 'FFFBF6EC' : 'FFFFFFFF'

      row.eachCell({ includeEmpty: true }, (cell, cIdx) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowBgColor },
        }
        cell.font = {
          name: 'Segoe UI',
          size: 10,
          color: { argb: 'FF2A1F0E' }, // Deep forest charcoal/brown
        }
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'left',
        }
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFEADFCA' } }, // Light beige border
        }

        // Apply number format if defined on column
        const colDef = sheetData.columns[cIdx - 1]
        if (colDef && colDef.numFmt) {
          cell.numFmt = colDef.numFmt
          cell.alignment = {
            vertical: 'middle',
            horizontal: 'right',
          }
        }
      })
    })

    // Auto-adjust column widths based on content
    worksheet.columns.forEach((column) => {
      let maxLen = 0
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const valStr = cell.value ? String(cell.value) : ''
        if (valStr.length > maxLen) {
          maxLen = valStr.length
        }
      })
      column.width = Math.max(maxLen + 4, 12)
    })
  })

  // Write workbook to buffer and trigger download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}
