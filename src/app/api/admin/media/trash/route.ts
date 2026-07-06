import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'
import { MEDIA_SLOTS } from '@/config/mediaSlots'
import { revalidatePath } from 'next/cache'
import { routing } from '@/i18n/routing'
import { createClient as createSupabaseServiceClient } from '@supabase/supabase-js'

const supabase = createSupabaseServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function isAuthed(req: NextRequest): Promise<boolean> {
  return await checkAdminAuth(req);}

function revalidatePages(slotKey: string) {
  const locales = routing.locales
  if (slotKey.startsWith('home.')) {
    locales.forEach((l) => revalidatePath(`/${l}`))
  } else if (slotKey.startsWith('about.')) {
    locales.forEach((l) => revalidatePath(`/${l}/notre-histoire`))
  } else if (slotKey.startsWith('contact.')) {
    locales.forEach((l) => revalidatePath(`/${l}/contact`))
  }
}

// Bulk purges media files and deletes DB records in batch
async function purgeMediaBulk(ids: string[]) {
  if (ids.length === 0) return 0

  const medias = await prisma.siteMedia.findMany({
    where: { id: { in: ids } },
  })

  if (medias.length === 0) return 0

  // Delete files from Supabase Storage
  const filenames = medias.map((media) => {
    const url = media.url
    if (url.startsWith('http')) {
      const parts = url.split('/')
      return parts[parts.length - 1]
    }
    return url.replace('/uploads/site/', '')
  })

  if (filenames.length > 0) {
    await supabase.storage.from('site-media').remove(filenames)
  }

  // Delete DB records in batch
  const deletedCount = await prisma.siteMedia.deleteMany({
    where: { id: { in: medias.map((m) => m.id) } },
  })

  return deletedCount.count
}

export async function GET(req: NextRequest) {
  if (!(await isAuthed(req))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const media = await prisma.siteMedia.findMany({
    where: { supprime: true },
    orderBy: { supprimeLe: 'desc' },
  })
  return NextResponse.json({ media })
}

export async function POST(req: NextRequest) {
  if (!(await isAuthed(req))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const { ids, action } = await req.json()

    if (action === 'empty') {
      const toPurge = await prisma.siteMedia.findMany({
        where: { supprime: true },
        select: { id: true },
      })
      const toPurgeIds = toPurge.map((m) => m.id)
      
      const deletedCount = toPurgeIds.length > 0 ? await purgeMediaBulk(toPurgeIds) : 0
      if (deletedCount !== toPurgeIds.length) {
        console.error('Media trash empty count mismatch:', {
          expected: toPurgeIds.length,
          deleted: deletedCount,
        })
      }

      await prisma.siteMediaLog.create({
        data: {
          slotKey: '*',
          action: 'PURGE',
          details: `Corbeille vidée : suppression définitive de ${deletedCount} média(s)`,
        },
      })

      return NextResponse.json({ success: true, deletedCount })
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Aucun média sélectionné' }, { status: 400 })
    }

    if (action === 'restore') {
      // 1. Fetch all media items to restore
      const targetMedias = await prisma.siteMedia.findMany({
        where: { id: { in: ids }, supprime: true },
      })

      if (targetMedias.length === 0) {
        return NextResponse.json({ error: 'Aucun média trouvé à restaurer' }, { status: 400 })
      }

      // 2. Identify active slots to displace
      const slotKeys = Array.from(new Set(targetMedias.map((m) => m.slotKey)))
      const activeMedias = await prisma.siteMedia.findMany({
        where: { slotKey: { in: slotKeys }, supprime: false },
      })

      // 3. Perform batch updates in a transaction
      await prisma.$transaction(async (tx) => {
        // Displace currently active medias
        if (activeMedias.length > 0) {
          await tx.siteMedia.updateMany({
            where: { id: { in: activeMedias.map((m) => m.id) } },
            data: { supprime: true, supprimeLe: new Date() },
          })
        }

        // Restore target medias
        await tx.siteMedia.updateMany({
          where: { id: { in: targetMedias.map((m) => m.id) } },
          data: { supprime: false, supprimeLe: null },
        })

        // Create log records
        const logsData = targetMedias.map((media) => {
          const slotDef = MEDIA_SLOTS.find((s) => s.key === media.slotKey)
          return {
            slotKey: media.slotKey,
            action: 'RESTORE',
            details: `Restauration du média du slot "${slotDef?.label ?? media.slotKey}" depuis la corbeille`,
          }
        })
        
        await tx.siteMediaLog.createMany({
          data: logsData,
        })
      })

      // 4. Revalidate pages outside the transaction
      slotKeys.forEach((slotKey) => revalidatePages(slotKey))

    } else if (action === 'delete') {
      const deletedCount = await purgeMediaBulk(ids)
      if (deletedCount !== ids.length) {
        console.error('Media trash delete count mismatch:', {
          expected: ids.length,
          deleted: deletedCount,
          ids,
        })
      }
      await prisma.siteMediaLog.create({
        data: {
          slotKey: '*',
          action: 'PURGE',
          details: `Suppression définitive de ${deletedCount} média(s)`,
        },
      })
      return NextResponse.json({ success: true, deletedCount })
    } else {
      return NextResponse.json({ error: 'Action non supportée' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Media trash POST error:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'opération' }, { status: 500 })
  }
}
