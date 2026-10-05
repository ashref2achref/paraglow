import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'
import { MEDIA_SLOTS } from '@/config/mediaSlots'
import { revalidatePath } from 'next/cache'
import sharp from 'sharp'
import { createClient as createSupabaseServiceClient } from '@supabase/supabase-js'
import { getMediaUploadPolicy } from '@/lib/mediaUploadPolicy'

const supabase = createSupabaseServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function isAuthed(req: NextRequest): Promise<boolean> {
  return await checkAdminAuth(req);}

import { routing } from '@/i18n/routing'

function revalidatePages(slotKey: string) {
  const locales = routing.locales
  if (slotKey.startsWith('home.')) {
    revalidatePath('/')
    locales.forEach((l) => revalidatePath(`/${l}`))
  } else if (slotKey.startsWith('about.')) {
    locales.forEach((l) => revalidatePath(`/${l}/notre-histoire`))
  } else if (slotKey.startsWith('contact.')) {
    locales.forEach((l) => revalidatePath(`/${l}/contact`))
  }
}

// GET — list all active media grouped by page
export async function GET(req: NextRequest) {
  if (!(await isAuthed(req))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const media = await prisma.siteMedia.findMany({ where: { supprime: false }, orderBy: { slotKey: 'asc' } })
  return NextResponse.json({ media })
}

// POST — upload file and create/replace SiteMedia for a slot
export async function POST(req: NextRequest) {
  if (!(await isAuthed(req))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const slotKey = formData.get('slotKey') as string | null
    const alt = (formData.get('alt') as string) || null

    if (!file || !slotKey) {
      return NextResponse.json({ error: 'Fichier et slotKey requis' }, { status: 400 })
    }

    // Validate slot
    const slotDef = MEDIA_SLOTS.find((s) => s.key === slotKey)
    if (!slotDef) {
      return NextResponse.json({ error: 'Slot invalide' }, { status: 400 })
    }

    const settings = await getMediaUploadPolicy()
    const mimeType = file.type
    const isImage = settings.allowedImageTypes.includes(mimeType)
    const isVideo = settings.allowedVideoTypes.includes(mimeType)

    if (!isImage && !isVideo) {
      return NextResponse.json({ error: 'Type de fichier non supporté. Accepté : JPG, PNG, WebP, MP4, WebM' }, { status: 400 })
    }

    if (isVideo) {
      return NextResponse.json({
        error: 'Les vidéos utilisent le flux d’upload direct sécurisé.',
      }, { status: 400 })
    }

    const maxSize = settings.maxImageSize
    if (file.size > maxSize) {
      const maxMb = Math.round(maxSize / (1024 * 1024))
      return NextResponse.json({ error: `Fichier trop volumineux. Maximum : ${maxMb} Mo` }, { status: 400 })
    }

    // Find the current active media for this slot (if any) — it gets soft-deleted, not erased,
    // so it can be recovered from the corbeille.
    const existing = await prisma.siteMedia.findFirst({ where: { slotKey, supprime: false } })

    // Save new file
    const ext = isImage ? 'webp' : mimeType.split('/')[1]
    const safeName = `${slotKey.replace(/\./g, '-')}-${Date.now()}.${ext}`

    let buffer = Buffer.from(await file.arrayBuffer())
    let width: number | null = null
    let height: number | null = null

    if (isImage) {
      const processed = sharp(buffer).webp({ quality: settings.imageQuality })
      const metadata = await processed.metadata()
      width = metadata.width ?? null
      height = metadata.height ?? null
      buffer = Buffer.from(await processed.toBuffer())
    }

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('site-media')
      .upload(safeName, buffer, {
        contentType: isImage ? 'image/webp' : mimeType,
        upsert: true
      })

    if (uploadError) {
      console.error('[Supabase Storage Upload Error]', uploadError)
      return NextResponse.json({ error: "Erreur d'upload vers Supabase Storage" }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('site-media')
      .getPublicUrl(safeName)

    const url = publicUrl

    if (existing) {
      await prisma.siteMedia.update({
        where: { id: existing.id },
        data: { supprime: true, supprimeLe: new Date() },
      })
    }

    const media = await prisma.siteMedia.create({
      data: { slotKey, type: isImage ? 'IMAGE' : 'VIDEO', url, alt, width, height },
    })

    await prisma.siteMediaLog.create({
      data: {
        slotKey,
        action: existing ? 'REPLACE' : 'UPLOAD',
        details: existing
          ? `Remplacement du média du slot "${slotDef.label}"`
          : `Ajout d'un média pour le slot "${slotDef.label}"`,
        changes: JSON.stringify({ url: { before: existing?.url ?? null, after: url } }),
      },
    })

    revalidatePages(slotKey)

    return NextResponse.json({ success: true, media })
  } catch (err) {
    console.error('[Media Upload Error]', err)
    return NextResponse.json({ error: 'Erreur lors de l\'upload' }, { status: 500 })
  }
}

// DELETE — soft-delete the active media of a slot (moves it to the corbeille, file kept on disk)
export async function DELETE(req: NextRequest) {
  if (!(await isAuthed(req))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const { slotKey } = await req.json()
    if (!slotKey) {
      return NextResponse.json({ error: 'slotKey requis' }, { status: 400 })
    }

    const existing = await prisma.siteMedia.findFirst({ where: { slotKey, supprime: false } })
    if (!existing) {
      return NextResponse.json({ error: 'Média introuvable' }, { status: 404 })
    }

    await prisma.siteMedia.update({
      where: { id: existing.id },
      data: { supprime: true, supprimeLe: new Date() },
    })

    const slotDef = MEDIA_SLOTS.find((s) => s.key === slotKey)
    await prisma.siteMediaLog.create({
      data: {
        slotKey,
        action: 'DELETE',
        details: `Mise en corbeille du média du slot "${slotDef?.label ?? slotKey}"`,
      },
    })

    revalidatePages(slotKey)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Media Delete Error]', err)
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
  }
}
