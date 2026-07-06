import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import path from 'path'
import { saveProductImageBuffer } from '@/lib/productImageStorage'

export const dynamic = 'force-dynamic'

const MAX_IMAGE_SIZE = 8 * 1024 * 1024
const MAX_MULTIPART_OVERHEAD = 1024 * 1024
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

async function isAuthed(req: NextRequest): Promise<boolean> {
  return await checkAdminAuth(req);}

function contentLengthTooLarge(req: NextRequest, maxSize: number) {
  const raw = req.headers.get('content-length')
  const parsed = raw ? Number.parseInt(raw, 10) : 0
  return Number.isFinite(parsed) && parsed > maxSize + MAX_MULTIPART_OVERHEAD
}

async function detectImageType(file: File) {
  const sample = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  if (sample[0] === 0xff && sample[1] === 0xd8 && sample[2] === 0xff) return 'image/jpeg'
  if (
    sample[0] === 0x89 &&
    sample[1] === 0x50 &&
    sample[2] === 0x4e &&
    sample[3] === 0x47 &&
    sample[4] === 0x0d &&
    sample[5] === 0x0a &&
    sample[6] === 0x1a &&
    sample[7] === 0x0a
  ) return 'image/png'
  if (
    sample[0] === 0x52 &&
    sample[1] === 0x49 &&
    sample[2] === 0x46 &&
    sample[3] === 0x46 &&
    sample[8] === 0x57 &&
    sample[9] === 0x45 &&
    sample[10] === 0x42 &&
    sample[11] === 0x50
  ) return 'image/webp'
  return null
}

export async function POST(req: NextRequest) {
  if (!(await isAuthed(req))) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  if (contentLengthTooLarge(req, MAX_IMAGE_SIZE)) {
    return NextResponse.json({ error: 'Image trop volumineuse. Maximum : 8 Mo' }, { status: 413 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    const extension = path.extname(file.name).toLowerCase()
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
      return NextResponse.json({ error: 'Extension image non autorisee. Formats acceptes : JPG, PNG, WebP' }, { status: 400 })
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Type MIME image non autorise. Formats acceptes : JPG, PNG, WebP' }, { status: 400 })
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'Image trop volumineuse. Maximum : 8 Mo' }, { status: 413 })
    }

    const detectedType = await detectImageType(file)
    if (!detectedType || detectedType !== file.type) {
      return NextResponse.json({ error: 'Le contenu du fichier ne correspond pas a une image JPG, PNG ou WebP valide' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.byteLength > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'Image trop volumineuse. Maximum : 8 Mo' }, { status: 413 })
    }

    const url = await saveProductImageBuffer(buffer)
    return NextResponse.json({ success: true, url })
  } catch (error) {
    console.error('[Product Image Upload Error]', error)
    return NextResponse.json({ error: 'Erreur lors de l upload de l image' }, { status: 500 })
  }
}
