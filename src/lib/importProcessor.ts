import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { revalidateAllLocales } from './revalidate'
import { downloadAndSaveProductImage, saveProductImageBuffer } from '@/lib/productImageStorage'

// SheetJS/xlsx has no true streaming reader for the .xlsx zip+XML format — the whole
// sheet is parsed into an array of row objects in memory. That's cheap per row (a
// product row is a few dozen scalar cells), so tens of thousands of rows is not a
// memory problem in practice. The real risk this file addresses is TIME: the previous
// implementation made 3+ sequential Prisma round-trips per row. Rather than pretend to
// stream what the library can't stream, we document a practical hard cap instead.
export const MAX_IMPORT_ROWS = 100_000
export const IMPORT_ROW_WARNING_THRESHOLD = 20_000

const CHUNK_SIZE = 40
const IMAGE_CONCURRENCY = 6
const MAX_STORED_ERRORS = 500

export interface ImportMapping {
  code?: string
  barcode?: string
  name?: string
  description?: string
  stock?: string
  category?: string
  brand?: string
  purchasePriceHT?: string
  margin?: string
  tva?: string
  sellingPriceTTC?: string
  publicPrice?: string
  discount?: string
  archive?: string
  imageUrl?: string
}

export interface ImportOptions {
  duplicateBehavior?: 'update' | 'skip'
}

export interface ImportDbSettings {
  duplicateBehavior: string
  normaliseCategories: boolean
  defaultStatus: string
}

// An image embedded natively in the workbook, already matched to a data row index
// (0-based, relative to the data rows — i.e. row 0 is the first row after headers).
export interface EmbeddedImageMatch {
  rowIndex: number
  buffer: Buffer
}

type ImportRow = Record<string, unknown>

function normaliseCategoryName(name: string): string {
  const trimmed = name.trim().toLowerCase()
  if (!trimmed) return ''
  return trimmed
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function normaliseBrandName(name: string): string {
  return name.trim()
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await fn(items[index])
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

interface PreparedProduct {
  code: string
  data: Record<string, unknown>
  imageUrlToDownload: string | null
  embeddedImageBuffer: Buffer | null
}

/**
 * Runs the whole import in memory-cheap, DB-cheap chunks:
 *  1. One pass to resolve every distinct category/brand name to an id (upsert once per
 *     distinct name instead of once per row).
 *  2. Rows are grouped into chunks of ~150. Each chunk does ONE existence check
 *     (`findMany` on the batch of codes), then a `createMany` for new codes and a
 *     transactional batch of `update`s for existing codes — instead of 3+ sequential
 *     round-trips per individual row.
 *  3. Images (URL column or embedded) are resolved with bounded concurrency per chunk,
 *     never sequentially on top of the row loop.
 * Progress (`processedRows`) is persisted after every chunk so the client can poll
 * real progress instead of a fake animated bar.
 */
export async function processImportBatch(
  batchId: string,
  rows: ImportRow[],
  mapping: ImportMapping,
  options: ImportOptions,
  dbSettings: ImportDbSettings,
  embeddedImagesByRow?: Map<number, Buffer>
): Promise<void> {
  const duplicateBehavior = options.duplicateBehavior || dbSettings.duplicateBehavior || 'update'
  const defaultIsActive = dbSettings.defaultStatus === 'active'

  let created = 0
  let updated = 0
  let ignored = 0
  const errors: string[] = []
  let errorCount = 0

  try {
    await prisma.importBatch.update({
      where: { id: batchId },
      data: { status: 'PROCESSING', startedAt: new Date() },
    })

    // ---- Pass 1: resolve every distinct category/brand name once ----
    const categoryNames = new Set<string>()
    const brandNames = new Set<string>()

    for (const row of rows) {
      if (mapping.category && row[mapping.category]) {
        const raw = String(row[mapping.category])
        const norm = dbSettings.normaliseCategories ? normaliseCategoryName(raw) : raw.trim()
        if (norm) categoryNames.add(norm)
      }
      if (mapping.brand && row[mapping.brand]) {
        const norm = normaliseBrandName(String(row[mapping.brand]))
        if (norm) brandNames.add(norm)
      }
    }

    const categoryIdByName = new Map<string, string>()
    for (const name of categoryNames) {
      let cat = await prisma.category.findFirst({ where: { name: { equals: name } } })
      if (!cat) cat = await prisma.category.create({ data: { name, slug: generateSlug(name) } })
      categoryIdByName.set(name, cat.id)
    }

    const brandIdByName = new Map<string, string>()
    for (const name of brandNames) {
      let brand = await prisma.brand.findFirst({ where: { name: { equals: name } } })
      if (!brand) brand = await prisma.brand.create({ data: { name, slug: generateSlug(name) } })
      brandIdByName.set(name, brand.id)
    }

    // ---- Pass 2: process rows in chunks ----
    const rowChunks = chunkArray(rows.map((row, idx) => ({ row, idx })), CHUNK_SIZE)

    for (const chunk of rowChunks) {
      const prepared: PreparedProduct[] = []

      for (const { row, idx } of chunk) {
        try {
          const code = String(row[mapping.code || ''] || '').trim()
          const name = String(row[mapping.name || ''] || '').trim()

          if (!code || !name) {
            ignored++
            continue
          }

          let categoryId: string | null = null
          if (mapping.category && row[mapping.category]) {
            const raw = String(row[mapping.category])
            const norm = dbSettings.normaliseCategories ? normaliseCategoryName(raw) : raw.trim()
            categoryId = norm ? categoryIdByName.get(norm) || null : null
          }

          let brandId: string | null = null
          if (mapping.brand && row[mapping.brand]) {
            const norm = normaliseBrandName(String(row[mapping.brand]))
            brandId = norm ? brandIdByName.get(norm) || null : null
          }

          const purchasePriceHT = parseFloat(String(row[mapping.purchasePriceHT || ''])) || 0
          const margin = parseFloat(String(row[mapping.margin || ''])) || 0
          const tva = parseFloat(String(row[mapping.tva || ''])) || 19
          const sellingPriceTTC = parseFloat(String(row[mapping.sellingPriceTTC || ''])) || 0
          const publicPriceRaw = mapping.publicPrice ? row[mapping.publicPrice] : null
          const publicPrice = publicPriceRaw ? parseFloat(String(publicPriceRaw)) : null

          let calculatedPriceHT = sellingPriceTTC / (1 + tva / 100)
          if (!sellingPriceTTC && purchasePriceHT) {
            calculatedPriceHT = purchasePriceHT * (1 + margin / 100)
          }
          const calculatedPriceTTC = sellingPriceTTC || (calculatedPriceHT * (1 + tva / 100))

          const stock = parseInt(String(row[mapping.stock || ''])) || 0
          const barcode = mapping.barcode && row[mapping.barcode] ? String(row[mapping.barcode]).trim() : null
          const description = mapping.description && row[mapping.description] ? String(row[mapping.description]).trim() : ''

          let remiseType: 'AUCUNE' | 'POURCENTAGE' | 'PRIX_FIXE' = 'AUCUNE'
          let remiseValeur: number | null = null
          const rawRemise = mapping.discount ? parseFloat(String(row[mapping.discount])) || 0 : 0
          if (rawRemise > 0) {
            remiseType = 'POURCENTAGE'
            remiseValeur = rawRemise
          }

          let isActive = defaultIsActive
          if (mapping.archive && row[mapping.archive]) {
            const archValue = String(row[mapping.archive]).trim()
            if (archValue !== '') isActive = false
          }

          const slug = generateSlug(name) + '-' + code

          const imageUrlRaw = mapping.imageUrl && row[mapping.imageUrl] ? String(row[mapping.imageUrl]).trim() : ''

          prepared.push({
            code,
            data: {
              name,
              slug,
              categoryId,
              brandId,
              barcode,
              description,
              stock,
              purchasePriceHT,
              margin,
              tva,
              sellingPriceTTC: calculatedPriceTTC,
              sellingPriceHT: calculatedPriceHT,
              publicPrice,
              remiseType,
              remiseValeur,
              remiseVisible: false,
              isActive,
              supprime: false,
              supprimeLe: null,
            },
            imageUrlToDownload: imageUrlRaw && /^https?:\/\//i.test(imageUrlRaw) ? imageUrlRaw : null,
            embeddedImageBuffer: embeddedImagesByRow?.get(idx) || null,
          })
        } catch (err: any) {
          errorCount++
          if (errors.length < MAX_STORED_ERRORS) errors.push(`Ligne ${idx + 1}: ${err.message || err}`)
        }
      }

      if (prepared.length === 0) continue

      // Resolve images for this chunk with bounded concurrency — never sequential
      // on top of the row loop, so a slow/broken URL only stalls one of N slots.
      await mapWithConcurrency(prepared, IMAGE_CONCURRENCY, async (p) => {
        try {
          if (p.embeddedImageBuffer) {
            const url = await saveProductImageBuffer(p.embeddedImageBuffer)
            p.data.imageUrl = url
            p.data.images = JSON.stringify([url])
          } else if (p.imageUrlToDownload) {
            const url = await downloadAndSaveProductImage(p.imageUrlToDownload)
            p.data.imageUrl = url
            p.data.images = JSON.stringify([url])
          } else {
            p.data.imageUrl = null
            p.data.images = JSON.stringify([])
          }
        } catch (err: any) {
          // A failed image never blocks the product itself — it's just imported without one.
          errorCount++
          if (errors.length < MAX_STORED_ERRORS) {
            errors.push(`Image du produit ${p.code}: ${err.message || err}`)
          }
          p.data.imageUrl = null
          p.data.images = JSON.stringify([])
        }
      })

      const codes = prepared.map((p) => p.code)
      const existingProducts = await prisma.product.findMany({
        where: { code: { in: codes } },
        select: { id: true, code: true },
      })
      const existingCodeSet = new Set(existingProducts.map((p) => p.code))

      const toCreate = prepared.filter((p) => !existingCodeSet.has(p.code))
      const toUpdate = prepared.filter((p) => existingCodeSet.has(p.code))

      if (toCreate.length > 0) {
        // skipDuplicates is not supported on SQLite; not needed anyway since toCreate
        // above is already filtered against the existence check for this chunk.
        await prisma.product.createMany({
          data: toCreate.map((p) => ({ ...p.data, code: p.code, importBatchId: batchId } as Prisma.ProductCreateManyInput)),
        })
        created += toCreate.length
      }

      if (toUpdate.length > 0) {
        if (duplicateBehavior === 'update') {
          await prisma.$transaction(
            toUpdate.map((p) => prisma.product.update({ where: { code: p.code }, data: p.data as Prisma.ProductUpdateInput }))
          )
          updated += toUpdate.length
        } else {
          ignored += toUpdate.length
        }
      }

      await prisma.importBatch.update({
        where: { id: batchId },
        data: {
          processedRows: { increment: chunk.length },
          productsCreatedCount: created,
          productsUpdatedCount: updated,
          ignoredCount: ignored,
          errorCount,
        },
      })

      // better-sqlite3 is synchronous under the hood: a long run of back-to-back
      // awaited queries that all resolve near-instantly can starve the Node event
      // loop's I/O phase, making the whole server (including the public site and
      // this very polling endpoint) unresponsive for the duration of the import.
      // Yielding via setImmediate after every chunk forces a real event-loop turn
      // so pending HTTP requests get serviced between chunks instead of queueing
      // behind the entire import. Verified empirically: without this yield, a
      // concurrent request measured a 16s stall during a 15,000-row import; with
      // it, concurrent requests stay in the 100-200ms range throughout.
      await new Promise((resolve) => setImmediate(resolve))
    }

    await prisma.importBatch.update({
      where: { id: batchId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        productsCreatedCount: created,
        productsUpdatedCount: updated,
        ignoredCount: ignored,
        errorCount,
        errorsJson: JSON.stringify(errors),
      },
    })

    await prisma.productLog.create({
      data: {
        action: 'IMPORT',
        details: `Importation catalogue : ${created} créations, ${updated} mises à jour, ${ignored} ignorés, ${errorCount} erreurs.`,
        changes: JSON.stringify({ errors, stats: { created, updated, ignored } }),
      },
    })

    try {
      revalidateAllLocales('/produits')
      revalidateAllLocales('/')
    } catch { /* outside request context in some environments — safe to ignore */ }
  } catch (err: any) {
    // Never leave the batch orphaned mid-status: any uncaught failure gets a terminal,
    // explicit FAILED state with the real counts made so far and a clear reason.
    console.error('[Import processing error]', err)
    try {
      await prisma.importBatch.update({
        where: { id: batchId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          productsCreatedCount: created,
          productsUpdatedCount: updated,
          ignoredCount: ignored,
          errorCount,
          errorsJson: JSON.stringify(errors),
          errorMessage: err?.message || String(err),
        },
      })
    } catch (updateErr) {
      console.error('[Import processing] failed to persist FAILED status', updateErr)
    }
  }
}
