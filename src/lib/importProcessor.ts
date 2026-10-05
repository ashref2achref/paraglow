import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { createHash } from 'node:crypto'
import { revalidateAllLocales } from './revalidate'
import {
  downloadAndSaveProductImage,
  productImageStoragePaths,
  removeUnreferencedProductImagePaths,
  saveProductImageBuffer,
} from '@/lib/productImageStorage'

// Excel files are parsed in memory, then processed in bounded database chunks.
// Keep each request small enough to finish reliably inside the Vercel function window,
// including slow remote-image downloads. Larger catalogues should be split into batches.
export const MAX_IMPORT_ROWS = 100_000
export const IMPORT_ROW_WARNING_THRESHOLD = 10_000

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

export interface ImportProcessControl {
  initialize?: boolean
  finalize?: boolean
  rowOffset?: number
}

// An image embedded natively in the workbook, already matched to a data row index
// (0-based, relative to the data rows — i.e. row 0 is the first row after headers).
export interface EmbeddedImageMatch {
  rowIndex: number
  buffer: Buffer
}

type ImportRow = Record<string, unknown>

function sanitizeImportName(name: string): string {
  if (!name) return ''
  // 1. Remove control characters
  let cleaned = name.replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
  // 2. Remove HTML tags to prevent XSS
  cleaned = cleaned.replace(/<[^>]*>/g, '')
  // 3. Replace backslashes and problematic quotes
  cleaned = cleaned.replace(/\\/g, '').replace(/["`]/g, "'")
  // 4. Replace multiple spaces/tabs/newlines with a single space
  cleaned = cleaned.replace(/\s+/g, ' ')
  return cleaned.trim()
}

function normaliseCategoryName(name: string): string {
  const sanitized = sanitizeImportName(name)
  if (!sanitized) return ''
  const trimmed = sanitized.toLowerCase()
  return trimmed
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function normaliseBrandName(name: string): string {
  return sanitizeImportName(name)
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function stableUniqueSlug(text: string, discriminator: string): string {
  const base = generateSlug(text) || 'item'
  const suffix = createHash('sha1').update(discriminator).digest('hex').slice(0, 8)
  return `${base}-${suffix}`
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
  embeddedImagesByRow?: Map<number, Buffer>,
  control: ImportProcessControl = {}
): Promise<void> {
  const initialize = control.initialize ?? true
  const finalize = control.finalize ?? true
  const rowOffset = Math.max(0, control.rowOffset ?? 0)
  const duplicateBehavior = options.duplicateBehavior || dbSettings.duplicateBehavior || 'update'
  const defaultIsActive = dbSettings.defaultStatus === 'active'

  let created = 0
  let updated = 0
  let ignored = 0
  const errors: string[] = []
  let errorCount = 0

  try {
    if (initialize) {
      await prisma.importBatch.update({
        where: { id: batchId },
        data: { status: 'PROCESSING', startedAt: new Date(), completedAt: null, errorMessage: null },
      })
    }

    // ---- Pass 1: resolve every distinct category/brand name once ----
    const categoryNames = new Set<string>()
    const brandNames = new Set<string>()

    for (const row of rows) {
      if (mapping.category && row[mapping.category]) {
        const raw = String(row[mapping.category])
        const norm = dbSettings.normaliseCategories ? normaliseCategoryName(raw) : sanitizeImportName(raw)
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
      if (!cat) cat = await prisma.category.create({ data: { name, slug: stableUniqueSlug(name, `category:${name}`) } })
      categoryIdByName.set(name, cat.id)
    }

    const brandIdByName = new Map<string, string>()
    for (const name of brandNames) {
      let brand = await prisma.brand.findFirst({ where: { name: { equals: name } } })
      if (!brand) brand = await prisma.brand.create({ data: { name, slug: stableUniqueSlug(name, `brand:${name}`) } })
      brandIdByName.set(name, brand.id)
    }

    // ---- Pass 2: process rows in chunks ----
    const rowChunks = chunkArray(rows.map((row, idx) => ({ row, idx })), CHUNK_SIZE)

    for (const chunk of rowChunks) {
      const beforeCreated = created
      const beforeUpdated = updated
      const beforeIgnored = ignored
      const beforeErrorCount = errorCount
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
            const norm = dbSettings.normaliseCategories ? normaliseCategoryName(raw) : sanitizeImportName(raw)
            categoryId = norm ? categoryIdByName.get(norm) || null : null
          }

          let brandId: string | null = null
          if (mapping.brand && row[mapping.brand]) {
            const norm = normaliseBrandName(String(row[mapping.brand]))
            brandId = norm ? brandIdByName.get(norm) || null : null
          }

          const purchasePriceHT = parseFloat(String(row[mapping.purchasePriceHT || ''])) || 0
          const margin = parseFloat(String(row[mapping.margin || ''])) || 0
          const parsedTva = Number.parseFloat(String(row[mapping.tva || '']))
          const tva = Number.isFinite(parsedTva) ? parsedTva : 19
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

          const slug = stableUniqueSlug(name, `product:${code}`)

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
            embeddedImageBuffer: embeddedImagesByRow?.get(rowOffset + idx) || null,
          })
        } catch (err: unknown) {
          errorCount++
          if (errors.length < MAX_STORED_ERRORS) {
            const message = err instanceof Error ? err.message : String(err)
            errors.push(`Ligne ${rowOffset + idx + 1}: ${message}`)
          }
        }
      }

      if (prepared.length === 0) {
        await prisma.importBatch.update({
          where: { id: batchId },
          data: {
            processedRows: { increment: chunk.length },
            productsCreatedCount: { increment: created - beforeCreated },
            productsUpdatedCount: { increment: updated - beforeUpdated },
            ignoredCount: { increment: ignored - beforeIgnored },
            errorCount: { increment: errorCount - beforeErrorCount },
          },
        })
        continue
      }

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
          }
        } catch (err: unknown) {
          // A failed image never blocks the product itself. On updates, keeping
          // these keys absent preserves the existing image instead of clearing it.
          errorCount++
          if (errors.length < MAX_STORED_ERRORS) {
            const message = err instanceof Error ? err.message : String(err)
            errors.push(`Image du produit ${p.code}: ${message}`)
          }
          delete p.data.imageUrl
          delete p.data.images
        }
      })

      const codes = prepared.map((p) => p.code)
      const existingProducts = await prisma.product.findMany({
        where: { code: { in: codes } },
        select: { id: true, code: true, images: true, imageUrl: true },
      })
      const existingCodeSet = new Set(existingProducts.map((p) => p.code))
      const existingByCode = new Map(existingProducts.map((product) => [product.code, product]))

      const toCreate = prepared.filter((p) => !existingCodeSet.has(p.code))
      const toUpdate = prepared.filter((p) => existingCodeSet.has(p.code))

      if (toCreate.length > 0) {
        // toCreate is already filtered against the existence check for this chunk,
        // so skipDuplicates is unnecessary here.
        await prisma.product.createMany({
          data: toCreate.map((p) => ({ ...p.data, code: p.code, importBatchId: batchId } as Prisma.ProductCreateManyInput)),
        })
        created += toCreate.length
      }

      if (toUpdate.length > 0) {
        if (duplicateBehavior === 'update') {
          const replacedImagePaths: string[] = []
          const updatedProductIds: string[] = []

          for (const product of toUpdate) {
            if (product.data.imageUrl !== undefined || product.data.images !== undefined) {
              const existing = existingByCode.get(product.code)
              if (existing) {
                replacedImagePaths.push(...productImageStoragePaths(existing.images, existing.imageUrl))
                updatedProductIds.push(existing.id)
              }
            }
          }

          await prisma.$transaction(
            toUpdate.map((p) => prisma.product.update({ where: { code: p.code }, data: p.data as Prisma.ProductUpdateInput }))
          )
          updated += toUpdate.length

          if (replacedImagePaths.length > 0) {
            try {
              await removeUnreferencedProductImagePaths(replacedImagePaths, updatedProductIds)
            } catch (error) {
              console.error('[Import] Old product image cleanup failed:', error)
            }
          }
        } else {
          ignored += toUpdate.length
        }
      }

      await prisma.importBatch.update({
        where: { id: batchId },
        data: {
          processedRows: { increment: chunk.length },
          productsCreatedCount: { increment: created - beforeCreated },
          productsUpdatedCount: { increment: updated - beforeUpdated },
          ignoredCount: { increment: ignored - beforeIgnored },
          errorCount: { increment: errorCount - beforeErrorCount },
        },
      })

      // Yield between chunks so pending I/O can run during a long import.
      await new Promise((resolve) => setImmediate(resolve))
    }

    if (errors.length > 0) {
      const current = await prisma.importBatch.findUnique({
        where: { id: batchId },
        select: { errorsJson: true },
      })
      let existingErrors: string[] = []
      try {
        existingErrors = current?.errorsJson ? JSON.parse(current.errorsJson) : []
      } catch {
        existingErrors = []
      }
      const mergedErrors = [...existingErrors, ...errors].slice(0, MAX_STORED_ERRORS)
      await prisma.importBatch.update({
        where: { id: batchId },
        data: { errorsJson: JSON.stringify(mergedErrors) },
      })
    }

    if (finalize) {
      const finalBatch = await prisma.importBatch.update({
        where: { id: batchId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      })

      let finalErrors: string[] = []
      try {
        finalErrors = finalBatch.errorsJson ? JSON.parse(finalBatch.errorsJson) : []
      } catch {
        finalErrors = []
      }

      await prisma.productLog.create({
        data: {
          action: 'IMPORT',
          details: `Importation catalogue : ${finalBatch.productsCreatedCount} créations, ${finalBatch.productsUpdatedCount} mises à jour, ${finalBatch.ignoredCount} ignorés, ${finalBatch.errorCount} erreurs.`,
          changes: JSON.stringify({
            errors: finalErrors,
            stats: {
              created: finalBatch.productsCreatedCount,
              updated: finalBatch.productsUpdatedCount,
              ignored: finalBatch.ignoredCount,
            },
          }),
        },
      })

      try {
        revalidateAllLocales('/produits')
        revalidateAllLocales('/')
      } catch { /* outside request context in some environments — safe to ignore */ }
    }
  } catch (err: unknown) {
    // Never leave the batch orphaned mid-status: any uncaught failure gets a terminal,
    // explicit FAILED state with the real counts made so far and a clear reason.
    console.error('[Import processing error]', err)
    try {
      const current = await prisma.importBatch.findUnique({
        where: { id: batchId },
        select: { errorsJson: true },
      })
      let existingErrors: string[] = []
      try {
        existingErrors = current?.errorsJson ? JSON.parse(current.errorsJson) : []
      } catch {
        existingErrors = []
      }
      const mergedErrors = [...existingErrors, ...errors].slice(0, MAX_STORED_ERRORS)
      await prisma.importBatch.update({
        where: { id: batchId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorsJson: JSON.stringify(mergedErrors),
          errorMessage: err instanceof Error ? err.message : String(err),
        },
      })
    } catch (updateErr) {
      console.error('[Import processing] failed to persist FAILED status', updateErr)
    }
    throw err
  }
}
