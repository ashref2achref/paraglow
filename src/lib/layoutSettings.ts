import prisma from '@/lib/prisma'
import { contactConfig } from '@/config/contact'

export interface CachedLayoutSettings {
  maintenanceMode: boolean
  email: string
  whatsappUrl: string
}

const CACHE_TTL_MS = 60_000

let cachedValue: CachedLayoutSettings | null = null
let cachedAt = 0
let pending: Promise<CachedLayoutSettings> | null = null

async function loadLayoutSettings(): Promise<CachedLayoutSettings> {
  let maintenanceMode = false
  let email = contactConfig.email
  let whatsappUrl = contactConfig.socials.whatsapp

  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: ['maintenanceMode', 'boutique'] } },
      select: { key: true, value: true },
    })

    const maintenanceSetting = rows.find((row) => row.key === 'maintenanceMode')
    const boutiqueSetting = rows.find((row) => row.key === 'boutique')
    maintenanceMode = maintenanceSetting?.value === 'true'

    if (boutiqueSetting) {
      try {
        const parsed = JSON.parse(boutiqueSetting.value) as {
          email?: string
          phoneWhatsApp?: string
        }
        email = parsed.email || email
        if (parsed.phoneWhatsApp) {
          whatsappUrl = `https://wa.me/${parsed.phoneWhatsApp.replace(/\+/g, '').replace(/\s+/g, '')}`
        }
      } catch {}
    }
  } catch (error) {
    console.error('Error loading cached layout settings:', error)
  }

  return { maintenanceMode, email, whatsappUrl }
}

export async function getCachedLayoutSettings(): Promise<CachedLayoutSettings> {
  const now = Date.now()
  if (cachedValue && now - cachedAt < CACHE_TTL_MS) return cachedValue
  if (pending) return pending

  pending = loadLayoutSettings()
  try {
    cachedValue = await pending
    cachedAt = Date.now()
    return cachedValue
  } finally {
    pending = null
  }
}

export function invalidateLayoutSettingsCache() {
  cachedValue = null
  cachedAt = 0
}
