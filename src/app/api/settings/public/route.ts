import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { fallbackSettings } from '@/store/settings'

export const revalidate = 300

export async function GET(request: NextRequest) {
  try {
    const rawSettings = await prisma.setting.findMany()
    const dbSettingsMap: Record<string, string> = {}
    rawSettings.forEach((s) => {
      dbSettingsMap[s.key] = s.value
    })

    // Parse boutique
    let boutique = { ...fallbackSettings.boutique }
    if (dbSettingsMap.boutique) {
      try {
        const parsed = JSON.parse(dbSettingsMap.boutique)
        boutique = { ...boutique, ...parsed }
      } catch {}
    }

    // Parse livraison
    let livraison = { ...fallbackSettings.livraison }
    if (dbSettingsMap.livraison) {
      try {
        const parsed = JSON.parse(dbSettingsMap.livraison)
        livraison = { 
          ...livraison, 
          ...parsed,
          defaultDeliveryFee: parseFloat(String(parsed.defaultDeliveryFee)),
          freeDeliveryThreshold: parseFloat(String(parsed.freeDeliveryThreshold)),
          livraisonGratuiteActive: parsed.livraisonGratuiteActive !== undefined ? !!parsed.livraisonGratuiteActive : false
        }
      } catch {}
    }

    // Parse marketing
    let marketing = { ...fallbackSettings.marketing }
    if (dbSettingsMap.marketing) {
      try {
        const parsed = JSON.parse(dbSettingsMap.marketing)
        marketing = {
          ...marketing,
          enableCheckoutPromo: parsed.enableCheckoutPromo !== undefined ? !!parsed.enableCheckoutPromo : true
        }
      } catch {}
    }

    // Parse maintenance
    const maintenance = dbSettingsMap.maintenanceMode === 'true'

    return NextResponse.json({
      settings: {
        boutique,
        livraison,
        marketing,
        maintenance
      }
    })
  } catch (error) {
    console.error('Public settings fetch error:', error)
    // Always return fallback settings on error to avoid crashing the public site
    return NextResponse.json({ settings: fallbackSettings })
  }
}
