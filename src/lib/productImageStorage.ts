import path from 'path'
import fs from 'fs/promises'
import sharp from 'sharp'
import { randomUUID } from 'node:crypto'

const MAX_IMAGE_SIZE = 8 * 1024 * 1024
const MAX_DOWNLOAD_SIZE = 8 * 1024 * 1024
const FETCH_TIMEOUT_MS = 10_000

/**
 * Single source of truth for the product-image optimization pipeline
 * (resize inside 1000x1000, convert to WebP q80). Used by the manual
 * product image upload route and by the catalogue import (URL column
 * and embedded Excel images), so all three paths produce identical output.
 */
export async function saveProductImageBuffer(buffer: Buffer): Promise<string> {
  if (buffer.byteLength > MAX_IMAGE_SIZE) {
    throw new Error('Image trop volumineuse (maximum 8 Mo)')
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products')
  await fs.mkdir(uploadDir, { recursive: true })

  const safeName = `product-${randomUUID()}.webp`
  const filePath = path.join(uploadDir, safeName)

  await sharp(buffer)
    .resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(filePath)

  return `/uploads/products/${safeName}`
}

/**
 * Downloads an image from a URL supplied in an import spreadsheet and runs it
 * through the same optimization pipeline. Bounded by a size cap and a fetch
 * timeout so one bad URL in a large import can't hang the whole batch.
 */
export async function downloadAndSaveProductImage(url: string): Promise<string> {
  const trimmed = url.trim()
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error('URL image invalide (doit commencer par http:// ou https://)')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(trimmed, { signal: controller.signal })
    if (!res.ok) throw new Error(`Téléchargement échoué (HTTP ${res.status})`)

    const contentLength = res.headers.get('content-length')
    if (contentLength && Number(contentLength) > MAX_DOWNLOAD_SIZE) {
      throw new Error('Image distante trop volumineuse (maximum 8 Mo)')
    }

    const arrayBuffer = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    return await saveProductImageBuffer(buffer)
  } finally {
    clearTimeout(timeout)
  }
}
