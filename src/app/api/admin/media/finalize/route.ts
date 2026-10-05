import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'
import { MEDIA_SLOTS } from '@/config/mediaSlots'
import { routing } from '@/i18n/routing'
import { getMediaUploadPolicy } from '@/lib/mediaUploadPolicy'

export const dynamic = 'force-dynamic'

const supabase = createSupabaseServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function revalidatePages(slotKey: string) {
  if (slotKey.startsWith('home.')) {
    revalidatePath('/')
    routing.locales.forEach((locale) => revalidatePath(`/${locale}`))
  } else if (slotKey.startsWith('about.')) {
    routing.locales.forEach((locale) => revalidatePath(`/${locale}/notre-histoire`))
  } else if (slotKey.startsWith('contact.')) {
    routing.locales.forEach((locale) => revalidatePath(`/${locale}/contact`))
  }
}

async function readPrefix(url: string, maxBytes = 16) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5_000)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Range: `bytes=0-${maxBytes - 1}` },
      cache: 'no-store',
    })
    if (!response.ok || !response.body) return null

    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    try {
      while (total < maxBytes) {
        const { value, done } = await reader.read()
        if (done) break
        if (!value) continue
        const remaining = maxBytes - total
        const slice = value.byteLength > remaining ? value.slice(0, remaining) : value
        chunks.push(slice)
        total += slice.byteLength
      }
      await reader.cancel()
    } finally {
      reader.releaseLock()
    }

    const prefix = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) {
      prefix.set(chunk, offset)
      offset += chunk.byteLength
    }
    return prefix
  } finally {
    clearTimeout(timer)
  }
}

async function hasValidVideoSignature(url: string, mimeType: string) {
  const bytes = await readPrefix(url)
  if (!bytes) return false

  if (mimeType === 'video/mp4') {
    return bytes.length >= 8 &&
      bytes[4] === 0x66 &&
      bytes[5] === 0x74 &&
      bytes[6] === 0x79 &&
      bytes[7] === 0x70
  }

  if (mimeType === 'video/webm') {
    return bytes.length >= 4 &&
      bytes[0] === 0x1a &&
      bytes[1] === 0x45 &&
      bytes[2] === 0xdf &&
      bytes[3] === 0xa3
  }

  return false
}

export async function POST(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let stagedPath = ''
  let committed = false

  try {
    const body = await request.json() as {
      slotKey?: string
      path?: string
      fileType?: string
      fileSize?: number
      alt?: string
    }

    const slotKey = String(body.slotKey || '')
    const path = String(body.path || '')
    const fileType = String(body.fileType || '')
    const fileSize = Number(body.fileSize || 0)
    const alt = String(body.alt || '').trim().slice(0, 300) || null
    const slot = MEDIA_SLOTS.find((item) => item.key === slotKey)
    stagedPath = path

    if (!slot || !slot.acceptVideo) {
      return NextResponse.json({ error: 'Slot vidéo invalide' }, { status: 400 })
    }

    const policy = await getMediaUploadPolicy()
    if (!policy.allowedVideoTypes.includes(fileType)) {
      return NextResponse.json({ error: 'Format vidéo non supporté' }, { status: 400 })
    }
    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > policy.maxVideoSize) {
      return NextResponse.json({ error: `Vidéo trop volumineuse. Maximum : ${policy.maxVideoSizeMB} Mo` }, { status: 400 })
    }

    const expectedPrefix = `videos/${slotKey.replace(/[^a-zA-Z0-9_-]/g, '-')}-`
    if (!path.startsWith(expectedPrefix) || !/\.(mp4|webm)$/i.test(path)) {
      return NextResponse.json({ error: 'Chemin vidéo invalide' }, { status: 400 })
    }

    const slash = path.lastIndexOf('/')
    const folder = slash >= 0 ? path.slice(0, slash) : ''
    const filename = slash >= 0 ? path.slice(slash + 1) : path

    const { data: storedFiles, error: listError } = await supabase.storage
      .from('site-media')
      .list(folder, { limit: 20, search: filename })

    const stored = storedFiles?.find((file) => file.name === filename)
    if (listError || !stored) {
      console.error('[Media finalize storage verification error]', listError)
      return NextResponse.json({ error: 'La vidéo uploadée est introuvable dans le stockage' }, { status: 400 })
    }

    const storedSize = Number(stored.metadata?.size || 0)
    if (!Number.isFinite(storedSize) || storedSize <= 0 || storedSize > policy.maxVideoSize || storedSize !== fileSize) {
      await supabase.storage.from('site-media').remove([path])
      stagedPath = ''
      return NextResponse.json({ error: 'Taille de la vidéo invalide ou incohérente' }, { status: 400 })
    }

    const { data: publicData } = supabase.storage.from('site-media').getPublicUrl(path)
    const publicUrl = publicData.publicUrl

    if (!(await hasValidVideoSignature(publicUrl, fileType))) {
      await supabase.storage.from('site-media').remove([path])
      stagedPath = ''
      return NextResponse.json({ error: 'Le contenu du fichier ne correspond pas à une vidéo MP4/WebM valide' }, { status: 400 })
    }

    const existing = await prisma.siteMedia.findFirst({ where: { slotKey, supprime: false } })

    await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.siteMedia.update({
          where: { id: existing.id },
          data: { supprime: true, supprimeLe: new Date() },
        })
      }

      await tx.siteMedia.create({
        data: { slotKey, type: 'VIDEO', url: publicUrl, alt, width: null, height: null },
      })

      await tx.siteMediaLog.create({
        data: {
          slotKey,
          action: existing ? 'REPLACE' : 'UPLOAD',
          details: existing
            ? `Remplacement du média du slot "${slot.label}" par une vidéo`
            : `Ajout d’une vidéo pour le slot "${slot.label}"`,
          changes: JSON.stringify({ url: { before: existing?.url ?? null, after: publicUrl } }),
        },
      })
    })

    committed = true
    revalidatePages(slotKey)
    return NextResponse.json({ success: true, url: publicUrl })
  } catch (error) {
    if (stagedPath && !committed) {
      try {
        await supabase.storage.from('site-media').remove([stagedPath])
      } catch {}
    }
    console.error('[Media finalize error]', error)
    return NextResponse.json({ error: 'Impossible de finaliser la vidéo' }, { status: 500 })
  }
}
