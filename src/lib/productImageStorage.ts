import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import sharp from 'sharp'
import { randomUUID } from 'node:crypto'
import { createClient as createSupabaseServiceClient } from '@supabase/supabase-js'
import prisma from '@/lib/prisma'

const supabase = createSupabaseServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_IMAGE_SIZE = 8 * 1024 * 1024
const MAX_DOWNLOAD_SIZE = 8 * 1024 * 1024
const FETCH_TIMEOUT_MS = 4_000
const MAX_REDIRECTS = 3
const SITE_MEDIA_PUBLIC_MARKER = '/storage/v1/object/public/site-media/'

export function siteMediaStoragePathFromUrl(value: string | null | undefined): string | null {
  if (!value) return null
  const raw = value.trim()
  if (!raw) return null

  if (raw.startsWith('products/') || raw.startsWith('videos/')) return raw

  try {
    const url = new URL(raw)
    const markerIndex = url.pathname.indexOf(SITE_MEDIA_PUBLIC_MARKER)
    if (markerIndex < 0) return null
    return decodeURIComponent(url.pathname.slice(markerIndex + SITE_MEDIA_PUBLIC_MARKER.length))
  } catch {
    return null
  }
}

export function productImageStoragePaths(images: string | null | undefined, imageUrl?: string | null) {
  const values: string[] = []
  if (imageUrl) values.push(imageUrl)

  if (images) {
    try {
      const parsed = JSON.parse(images) as unknown
      if (Array.isArray(parsed)) {
        for (const value of parsed) if (typeof value === 'string') values.push(value)
      }
    } catch {
      values.push(images)
    }
  }

  return Array.from(new Set(
    values
      .map(siteMediaStoragePathFromUrl)
      .filter((path): path is string => Boolean(path?.startsWith('products/')))
  ))
}

export async function removeSiteMediaObjects(paths: string[]) {
  const unique = Array.from(new Set(paths.filter(Boolean)))
  if (unique.length === 0) return

  const { error } = await supabase.storage.from('site-media').remove(unique)
  if (error) throw error
}

export async function removeUnreferencedProductImagePaths(paths: string[], excludeProductIds: string[] = []) {
  const candidates = Array.from(new Set(paths.filter((path) => path.startsWith('products/'))))
  if (candidates.length === 0) return []

  const references = await prisma.product.findMany({
    where: {
      ...(excludeProductIds.length > 0 ? { id: { notIn: excludeProductIds } } : {}),
      OR: candidates.flatMap((path) => [
        { imageUrl: { contains: path } },
        { images: { contains: path } },
      ]),
    },
    select: { images: true, imageUrl: true },
  })

  const referencedPaths = new Set(
    references.flatMap((product) => productImageStoragePaths(product.images, product.imageUrl))
  )
  const removable = candidates.filter((path) => !referencedPaths.has(path))

  await removeSiteMediaObjects(removable)
  return removable
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true
  }

  const [a, b] = parts
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

function isPrivateIp(address: string): boolean {
  const normalized = address.toLowerCase().split('%')[0]

  if (normalized.startsWith('::ffff:')) {
    return isPrivateIpv4(normalized.slice('::ffff:'.length))
  }

  const family = isIP(normalized)
  if (family === 4) return isPrivateIpv4(normalized)
  if (family !== 6) return true

  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith('ff')
  )
}

async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error('URL image invalide')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('URL image invalide (HTTP/HTTPS uniquement)')
  }
  if (parsed.username || parsed.password) {
    throw new Error('URL image invalide (identifiants interdits)')
  }

  const hostname = parsed.hostname.toLowerCase()
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error('URL image locale/interne interdite')
  }

  const directFamily = isIP(hostname)
  if (directFamily > 0) {
    if (isPrivateIp(hostname)) throw new Error('Adresse IP privée/interne interdite')
    return parsed
  }

  const resolved = await lookup(hostname, { all: true, verbatim: true })
  if (resolved.length === 0 || resolved.some(({ address }) => isPrivateIp(address))) {
    throw new Error('Adresse réseau privée/interne interdite')
  }

  return parsed
}

async function fetchRemoteImage(url: string, signal: AbortSignal): Promise<Response> {
  let current = url

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const safeUrl = await assertPublicHttpUrl(current)
    const response = await fetch(safeUrl, {
      signal,
      redirect: 'manual',
      headers: { 'User-Agent': 'ParaGlow-Image-Importer/1.0' },
    })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) throw new Error('Redirection image invalide')
      if (redirectCount === MAX_REDIRECTS) throw new Error('Trop de redirections pour cette image')
      current = new URL(location, safeUrl).toString()
      continue
    }

    return response
  }

  throw new Error('Trop de redirections pour cette image')
}

async function readResponseWithLimit(response: Response): Promise<Buffer> {
  const contentLength = response.headers.get('content-length')
  if (contentLength && Number(contentLength) > MAX_DOWNLOAD_SIZE) {
    throw new Error('Image distante trop volumineuse (maximum 8 Mo)')
  }

  if (!response.body) throw new Error('Réponse image vide')

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue

      total += value.byteLength
      if (total > MAX_DOWNLOAD_SIZE) {
        await reader.cancel()
        throw new Error('Image distante trop volumineuse (maximum 8 Mo)')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), total)
}

/**
 * Single source of truth for the product-image optimization pipeline.
 */
export async function saveProductImageBuffer(buffer: Buffer): Promise<string> {
  if (buffer.byteLength > MAX_IMAGE_SIZE) {
    throw new Error('Image trop volumineuse (maximum 8 Mo)')
  }

  const metadata = await sharp(buffer, { failOn: 'error' }).metadata()
  if (!metadata.format) {
    throw new Error('Format image invalide')
  }

  const safeName = `products/product-${randomUUID()}.webp`
  const processedBuffer = await sharp(buffer, { failOn: 'error' })
    .resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer()

  const { error: uploadError } = await supabase.storage
    .from('site-media')
    .upload(safeName, processedBuffer, {
      contentType: 'image/webp',
      upsert: false,
    })

  if (uploadError) {
    console.error('[Supabase Storage Upload Error]', uploadError)
    throw new Error("Erreur d'upload vers Supabase Storage")
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('site-media').getPublicUrl(safeName)

  return publicUrl
}

/**
 * Downloads a spreadsheet-supplied image URL safely:
 * - public HTTP(S) only
 * - private/loopback/link-local DNS targets rejected
 * - redirects revalidated
 * - streaming size cap enforced before buffering the full response
 */
export async function downloadAndSaveProductImage(url: string): Promise<string> {
  const trimmed = url.trim()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetchRemoteImage(trimmed, controller.signal)
    if (!response.ok) {
      throw new Error(`Téléchargement échoué (HTTP ${response.status})`)
    }

    const contentType = response.headers.get('content-type')?.toLowerCase() || ''
    if (contentType && !contentType.startsWith('image/') && !contentType.startsWith('application/octet-stream')) {
      throw new Error('Le fichier distant n’est pas une image')
    }

    const buffer = await readResponseWithLimit(response)
    return await saveProductImageBuffer(buffer)
  } finally {
    clearTimeout(timeout)
  }
}
