import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import { randomUUID } from 'node:crypto'
import { createClient as createSupabaseServiceClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const MAX_DOCUMENT_SIZE = 4 * 1024 * 1024
const MAX_MULTIPART_OVERHEAD = 512 * 1024
const DOCUMENT_BUCKET = 'admin-documents'

const supabase = createSupabaseServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function ensureDocumentBucket() {
  const { error: getError } = await supabase.storage.getBucket(DOCUMENT_BUCKET)
  if (!getError) return

  const { error: createError } = await supabase.storage.createBucket(DOCUMENT_BUCKET, {
    public: false,
    fileSizeLimit: MAX_DOCUMENT_SIZE,
    allowedMimeTypes: ['application/pdf'],
  })

  if (createError && !/already exists|duplicate/i.test(createError.message)) {
    throw createError
  }
}

function contentLengthTooLarge(req: NextRequest) {
  const raw = req.headers.get('content-length')
  const parsed = raw ? Number.parseInt(raw, 10) : 0
  return Number.isFinite(parsed) && parsed > MAX_DOCUMENT_SIZE + MAX_MULTIPART_OVERHEAD
}

async function isRealPdf(file: File) {
  const sample = new Uint8Array(await file.slice(0, 5).arrayBuffer())
  return sample[0] === 0x25 && sample[1] === 0x50 && sample[2] === 0x44 && sample[3] === 0x46 && sample[4] === 0x2d
}

export async function POST(req: NextRequest) {
  if (!(await checkAdminAuth(req))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  if (contentLengthTooLarge(req)) {
    return NextResponse.json({ error: 'Document trop volumineux. Maximum : 4 Mo' }, { status: 413 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    if (file.type !== 'application/pdf' || file.size > MAX_DOCUMENT_SIZE || !(await isRealPdf(file))) {
      return NextResponse.json({ error: 'PDF invalide ou trop volumineux (maximum 4 Mo)' }, { status: 400 })
    }

    await ensureDocumentBucket()
    const safeName = `doc-${randomUUID()}.pdf`
    const storagePath = `documents/${safeName}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false })

    if (uploadError) throw uploadError

    return NextResponse.json({
      success: true,
      url: `/api/admin/documents/${safeName}`,
      name: safeName,
    })
  } catch (error) {
    console.error('[Document Upload Error]', error)
    return NextResponse.json({ error: 'Erreur lors de l upload du document' }, { status: 500 })
  }
}
