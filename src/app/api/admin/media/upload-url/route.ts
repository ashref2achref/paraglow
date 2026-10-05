import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseServiceClient } from '@supabase/supabase-js'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'
import { MEDIA_SLOTS } from '@/config/mediaSlots'
import { getMediaUploadPolicy } from '@/lib/mediaUploadPolicy'

export const dynamic = 'force-dynamic'

const STAGED_UPLOAD_MAX_AGE_MS = 6 * 60 * 60 * 1000

const supabase = createSupabaseServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function safeVideoPath(path: string) {
  return /^videos\/[a-zA-Z0-9_-]+-[0-9]+-[a-f0-9-]{36}\.(mp4|webm)$/i.test(path)
}

async function removeIfUnreferenced(path: string) {
  if (!safeVideoPath(path)) return false

  const referenced = await prisma.siteMedia.findFirst({
    where: { url: { contains: path } },
    select: { id: true },
  })
  if (referenced) return false

  const { error } = await supabase.storage.from('site-media').remove([path])
  if (error) throw error
  return true
}

async function cleanupAbandonedSlotUploads(slotKey: string) {
  const prefix = `${slotKey.replace(/[^a-zA-Z0-9_-]/g, '-')}-`
  const { data, error } = await supabase.storage
    .from('site-media')
    .list('videos', { limit: 100, search: prefix, sortBy: { column: 'created_at', order: 'asc' } })

  if (error || !data?.length) return

  const cutoff = Date.now() - STAGED_UPLOAD_MAX_AGE_MS
  const stalePaths = data
    .filter((file) => file.name.startsWith(prefix))
    .filter((file) => {
      const createdAt = file.created_at ? new Date(file.created_at).getTime() : 0
      return createdAt > 0 && createdAt < cutoff
    })
    .map((file) => `videos/${file.name}`)

  for (const path of stalePaths) {
    try {
      await removeIfUnreferenced(path)
    } catch (error) {
      console.error('[Media staged-upload cleanup error]', error)
    }
  }
}

export async function POST(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json() as {
      slotKey?: string
      fileName?: string
      fileType?: string
      fileSize?: number
    }

    const slotKey = String(body.slotKey || '')
    const fileType = String(body.fileType || '')
    const fileSize = Number(body.fileSize || 0)
    const slot = MEDIA_SLOTS.find((item) => item.key === slotKey)

    if (!slot) {
      return NextResponse.json({ error: 'Slot invalide' }, { status: 400 })
    }
    if (!slot.acceptVideo) {
      return NextResponse.json({ error: 'Ce slot n’accepte pas les vidéos' }, { status: 400 })
    }

    const policy = await getMediaUploadPolicy()
    if (!policy.allowedVideoTypes.includes(fileType)) {
      return NextResponse.json({ error: 'Format vidéo non supporté. Utilisez MP4 ou WebM.' }, { status: 400 })
    }
    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > policy.maxVideoSize) {
      return NextResponse.json({
        error: `Vidéo trop volumineuse. Maximum : ${policy.maxVideoSizeMB} Mo`,
      }, { status: 400 })
    }

    await cleanupAbandonedSlotUploads(slotKey)

    const ext = fileType === 'video/webm' ? 'webm' : 'mp4'
    const slotPrefix = slotKey.replace(/[^a-zA-Z0-9_-]/g, '-')
    const path = `videos/${slotPrefix}-${Date.now()}-${crypto.randomUUID()}.${ext}`

    const { data, error } = await supabase.storage
      .from('site-media')
      .createSignedUploadUrl(path, { upsert: false })

    if (error || !data) {
      console.error('[Media signed upload URL error]', error)
      return NextResponse.json({ error: 'Impossible de préparer l’upload vidéo' }, { status: 500 })
    }

    return NextResponse.json({
      path: data.path,
      token: data.token,
      maxVideoSizeMB: policy.maxVideoSizeMB,
    })
  } catch (error) {
    console.error('[Media signed upload prepare error]', error)
    return NextResponse.json({ error: 'Impossible de préparer l’upload vidéo' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json() as { path?: string }
    const path = String(body.path || '')
    if (!safeVideoPath(path)) {
      return NextResponse.json({ error: 'Chemin vidéo invalide' }, { status: 400 })
    }

    const removed = await removeIfUnreferenced(path)
    return NextResponse.json({ success: true, removed })
  } catch (error) {
    console.error('[Media staged upload delete error]', error)
    return NextResponse.json({ error: 'Impossible de nettoyer l’upload vidéo' }, { status: 500 })
  }
}
