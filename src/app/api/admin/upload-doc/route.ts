import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import path from 'path'
import fs from 'fs/promises'
import { randomUUID } from 'node:crypto'

export const dynamic = 'force-dynamic'

const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024
const MAX_MULTIPART_OVERHEAD = 1024 * 1024

function isAuthed(req: NextRequest): boolean {
  return checkAdminAuth(req)
}

function contentLengthTooLarge(req: NextRequest, maxSize: number) {
  const raw = req.headers.get('content-length')
  const parsed = raw ? Number.parseInt(raw, 10) : 0
  return Number.isFinite(parsed) && parsed > maxSize + MAX_MULTIPART_OVERHEAD
}

async function isRealPdf(file: File) {
  const sample = new Uint8Array(await file.slice(0, 5).arrayBuffer())
  return sample[0] === 0x25 && sample[1] === 0x50 && sample[2] === 0x44 && sample[3] === 0x46 && sample[4] === 0x2d
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  if (contentLengthTooLarge(req, MAX_DOCUMENT_SIZE)) {
    return NextResponse.json({ error: 'Document trop volumineux. Maximum : 10 Mo' }, { status: 413 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    const extension = path.extname(file.name).toLowerCase()
    if (extension !== '.pdf' || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Document non autorise. Format accepte : PDF uniquement' }, { status: 400 })
    }

    if (file.size > MAX_DOCUMENT_SIZE) {
      return NextResponse.json({ error: 'Document trop volumineux. Maximum : 10 Mo' }, { status: 413 })
    }

    if (!(await isRealPdf(file))) {
      return NextResponse.json({ error: 'Le contenu du fichier ne correspond pas a un PDF valide' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.byteLength > MAX_DOCUMENT_SIZE) {
      return NextResponse.json({ error: 'Document trop volumineux. Maximum : 10 Mo' }, { status: 413 })
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents')
    await fs.mkdir(uploadDir, { recursive: true })

    const safeName = `doc-${randomUUID()}.pdf`
    const filePath = path.join(uploadDir, safeName)
    await fs.writeFile(filePath, buffer)

    return NextResponse.json({ success: true, url: `/uploads/documents/${safeName}`, name: safeName })
  } catch (error) {
    console.error('[Document Upload Error]', error)
    return NextResponse.json({ error: 'Erreur lors de l upload du document' }, { status: 500 })
  }
}
