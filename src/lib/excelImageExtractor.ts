import ExcelJS from 'exceljs'

/**
 * Extracts images natively embedded in an .xlsx worksheet (as opposed to an "URL image"
 * column), matching each one to the data-row index it's anchored over.
 *
 * ExcelJS anchors images with a 0-based row that INCLUDES the header row (verified
 * empirically: an image anchored over the sheet's 2nd row — the first data row after a
 * single header row — reports `tl.nativeRow === 1`). Our row-data arrays (from
 * `xlsx`'s `sheet_to_json`) are 0-based and exclude the header, so we subtract 1 to
 * align the two coordinate systems.
 *
 * If several images anchor to the same row, only the first one encountered is kept —
 * one product photo per row is the supported case.
 */
export async function extractEmbeddedImagesByRow(buffer: Buffer, sheetName: string): Promise<Map<number, Buffer>> {
  const workbook = new ExcelJS.Workbook()
  // Technical constraint: ExcelJS typings expect a legacy global Node.js Buffer,
  // whereas modern Node environments resolve this parameter to Buffer<ArrayBufferLike>.
  // Casting to 'any' is required to bridge this typescript definition mismatch.
  await workbook.xlsx.load(buffer as any)
  const worksheet = workbook.getWorksheet(sheetName)
  const result = new Map<number, Buffer>()
  if (!worksheet) return result

  for (const img of worksheet.getImages()) {
    const media = workbook.getImage(Number(img.imageId))
    if (!media?.buffer) continue

    const dataRowIndex = Math.round(img.range.tl.nativeRow) - 1
    if (dataRowIndex < 0) continue
    if (!result.has(dataRowIndex)) {
      result.set(dataRowIndex, Buffer.from(media.buffer))
    }
  }

  return result
}

export async function hasEmbeddedImages(buffer: Buffer, sheetName: string): Promise<boolean> {
  try {
    const workbook = new ExcelJS.Workbook()
    // Technical constraint: ExcelJS typings expect a legacy global Node.js Buffer,
    // whereas modern Node environments resolve this parameter to Buffer<ArrayBufferLike>.
    // Casting to 'any' is required to bridge this typescript definition mismatch.
    await workbook.xlsx.load(buffer as any)
    const worksheet = workbook.getWorksheet(sheetName)
    if (!worksheet) return false
    return worksheet.getImages().length > 0
  } catch {
    return false
  }
}
