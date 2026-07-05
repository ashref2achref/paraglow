import prisma from '@/lib/prisma'

interface SiteMediaResult {
  type: string
  url: string
  alt: string | null
  width: number | null
  height: number | null
}

export async function getSiteMedia(slotKey: string): Promise<SiteMediaResult | null> {
  try {
    const media = await prisma.siteMedia.findFirst({ where: { slotKey, supprime: false } })
    if (!media) return null
    return {
      type: media.type,
      url: media.url,
      alt: media.alt,
      width: media.width,
      height: media.height,
    }
  } catch {
    return null
  }
}

export async function getSiteMediaBatch(slotKeys: string[]): Promise<Record<string, SiteMediaResult | null>> {
  try {
    const results = await prisma.siteMedia.findMany({
      where: { slotKey: { in: slotKeys }, supprime: false },
    })
    const map: Record<string, SiteMediaResult | null> = {}
    for (const key of slotKeys) {
      const found = results.find((r) => r.slotKey === key)
      map[key] = found ? {
        type: found.type,
        url: found.url,
        alt: found.alt,
        width: found.width,
        height: found.height,
      } : null
    }
    return map
  } catch {
    const map: Record<string, SiteMediaResult | null> = {}
    for (const key of slotKeys) map[key] = null
    return map
  }
}
