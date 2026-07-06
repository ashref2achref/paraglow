import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import path from 'path'
import fs from 'fs/promises'

export const dynamic = 'force-dynamic'

async function checkAuth(request: NextRequest) {
  return await checkAdminAuth(request)
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ name: string }> }) {
  if (!(await checkAuth(request))) {
    return new NextResponse('Non autorisé', { status: 401 })
  }

  const { name } = await ctx.params
  
  // Protect against directory traversal attacks (only allow doc-UUID.pdf format)
  const safeName = path.basename(name)
  if (!/^doc-[a-f0-9-]{36}\.pdf$/i.test(safeName)) {
    return new NextResponse('Fichier invalide', { status: 400 })
  }

  const filePath = path.join(process.cwd(), 'private-uploads', 'documents', safeName)

  try {
    const fileBuffer = await fs.readFile(filePath)
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}"`,
      },
    })
  } catch (err) {
    console.error('[Document Read Error]', err)
    return new NextResponse('Document introuvable', { status: 404 })
  }
}
