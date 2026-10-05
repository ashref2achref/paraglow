import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import { createClient as createSupabaseServiceClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const DOCUMENT_BUCKET = 'admin-documents'

const supabase = createSupabaseServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest, ctx: { params: Promise<{ name: string }> }) {
  if (!(await checkAdminAuth(request))) {
    return new NextResponse('Non autorisé', { status: 401 })
  }

  const { name } = await ctx.params
  if (!/^doc-[a-f0-9-]{36}\.pdf$/i.test(name)) {
    return new NextResponse('Fichier invalide', { status: 400 })
  }

  try {
    const { data, error } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .download(`documents/${name}`)

    if (error || !data) {
      return new NextResponse('Document introuvable', { status: 404 })
    }

    const buffer = Buffer.from(await data.arrayBuffer())
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${name}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('[Document Read Error]', error)
    return new NextResponse('Document introuvable', { status: 404 })
  }
}
