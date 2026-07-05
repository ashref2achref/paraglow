import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { checkAdminAuth } from '@/lib/adminSession'
import { getAdminCredentials } from '@/lib/adminCredentials'

export const dynamic = 'force-dynamic'

// Get all settings
export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const rawSettings = await prisma.setting.findMany()
    const settings: Record<string, string> = {
      currency: 'TND',
      priceFormat: '3',
      lowStockThreshold: '10',
      defaultTva: '19',
      productsPerPage: '20',
      duplicateBehavior: 'update',
    }

    rawSettings.forEach((s) => {
      settings[s.key] = s.value
    })

    // Ensure domain JSON keys are initialized if they don't exist
    if (!settings.catalogue) {
      settings.catalogue = JSON.stringify({
        currency: settings.currency,
        priceFormat: settings.priceFormat,
        lowStockThreshold: parseInt(settings.lowStockThreshold) || 10,
        defaultTva: parseFloat(settings.defaultTva) || 19,
        productsPerPage: parseInt(settings.productsPerPage) || 20,
      })
    }
    if (!settings.import) {
      settings.import = JSON.stringify({
        duplicateBehavior: settings.duplicateBehavior || 'update',
        normaliseCategories: true,
        defaultStatus: 'inactive',
        preferredFileFormat: 'xlsx'
      })
    }
    if (!settings.commandes) {
      settings.commandes = JSON.stringify({
        alertThresholdHours: 24,
        defaultDeliveryFee: 7.000,
        orderPrefix: 'PG-2026-',
        defaultStatusInternal: 'CONFIRMED',
        enableWhatsAppLink: true
      })
    }

    // Default boutique details
    if (!settings.boutique) {
      settings.boutique = JSON.stringify({
        name: 'ParaGlow',
        slogan: 'Votre beauté, votre santé, votre glow.',
        email: 'glowpara75@gmail.com',
        phoneWhatsApp: '+216 29 613 681',
        phoneFixed: '+216 58 272 171',
        address: 'Route de Morneg km7, El Yasminette, Ben Arous - 2096',
        addressAr: 'طريق مرناق كم 7، الياسمينات، بن عروس - 2096',
        hours: '7j/7 · 09h30 - 22h00',
        instagram: 'https://www.instagram.com/para_glow_fs?igsh=MWo2ajhja2NqZmkxaQ==',
        tiktok: 'https://www.tiktok.com/@helafkihe?_r=1&_t=ZS-97VpPzTN0Fk',
        facebook: 'https://www.facebook.com/profile.php?id=61591658786356&mibextid=wwXIfr',
        googleMapsUrl: 'https://maps.app.goo.gl/46PvZT1J16yEV9tN6'
      })
    }

    // Default livraison details
    if (!settings.livraison) {
      settings.livraison = JSON.stringify({
        defaultDeliveryFee: 7.0,
        freeDeliveryThreshold: 150.0,
        deliveryNotes: 'partout en Tunisie',
        livraisonGratuiteActive: false
      })
    }

    // Default maintenanceMode details
    if (!settings.maintenanceMode) {
      settings.maintenanceMode = 'false'
    }

    // Return the email too (without password hash!)
    let adminEmail = 'admin@paraglow.tn'
    try {
      const emailSetting = await prisma.setting.findUnique({ where: { key: 'admin_email' } })
      if (emailSetting) adminEmail = emailSetting.value
    } catch {}
    settings.admin_email = adminEmail

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// Save settings or execute settings action
export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action } = body

    if (action === 'change_password') {
      const { email, oldPassword, newPassword } = body
      if (!email || !oldPassword || !newPassword) {
        return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
      }

      const credentials = await getAdminCredentials()
      if (!credentials.passwordHash) {
        return NextResponse.json({
          error: 'ADMIN_PASSWORD_HASH doit etre configure avant de modifier les identifiants.',
        }, { status: 400 })
      }

      const isValid = email === credentials.email && bcrypt.compareSync(oldPassword, credentials.passwordHash)
      if (!isValid) {
        return NextResponse.json({ error: 'Ancien mot de passe incorrect' }, { status: 400 })
      }

      // Save new email and password hash
      const newHash = bcrypt.hashSync(newPassword, 10)
      await prisma.setting.upsert({
        where: { key: 'admin_email' },
        update: { value: email },
        create: { key: 'admin_email', value: email }
      })
      await prisma.setting.upsert({
        where: { key: 'admin_password_hash' },
        update: { value: newHash },
        create: { key: 'admin_password_hash', value: newHash }
      })

      return NextResponse.json({ success: true, message: 'Identifiants mis à jour avec succès' })
    }

    if (action === 'clear_cache') {
      try {
        const { revalidateAllLocales } = await import('@/lib/revalidate')
        revalidateAllLocales('/', 'layout')
        revalidateAllLocales('/catalogue', 'layout')
        revalidateAllLocales('/contact', 'page')
      } catch {}
      return NextResponse.json({ success: true, message: 'Cache vidé avec succès' })
    }

    if (action === 'dry_run_purge_orphans') {
      const categories = await prisma.category.findMany({
        where: { products: { none: {} } },
        select: { id: true, name: true }
      })
      const brands = await prisma.brand.findMany({
        where: { products: { none: {} } },
        select: { id: true, name: true }
      })
      return NextResponse.json({ categories, brands })
    }

    if (action === 'force_purge_orphans') {
      const subCategories = await prisma.category.deleteMany({
        where: {
          parentId: { not: null },
          products: { none: {} }
        }
      })
      const parentCategories = await prisma.category.deleteMany({
        where: {
          parentId: null,
          products: { none: {} }
        }
      })
      const brands = await prisma.brand.deleteMany({
        where: {
          products: { none: {} }
        }
      })

      try {
        const { revalidateAllLocales } = await import('@/lib/revalidate')
        revalidateAllLocales('/')
        revalidateAllLocales('/catalogue')
      } catch (error) {
        console.error('Error revalidating paths after orphan purge:', error)
      }

      return NextResponse.json({
        success: true,
        message: `Nettoyage forcé terminé : ${subCategories.count + parentCategories.count} catégories et ${brands.count} marques supprimées.`
      })
    }

    if (action === 'purge_trash') {
      // Permanent delete
      const deletedProducts = await prisma.product.deleteMany({ where: { supprime: true } })
      const deletedOrders = await prisma.order.deleteMany({ where: { supprime: true } })
      
      // Auto-purge orphan categories/brands
      const { purgeOrphans } = await import('@/lib/purgeOrphans')
      await purgeOrphans()

      return NextResponse.json({
        success: true,
        message: `Corbeille vidée : ${deletedProducts.count} produits et ${deletedOrders.count} commandes supprimés définitivement.`
      })
    }

    // Default settings save
    const { settings } = body
    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Données incorrectes' }, { status: 400 })
    }

    // Sync individual keys for backward compatibility when domain JSON keys are updated
    const enrichedSettings = { ...settings }

    if (settings.catalogue) {
      try {
        const catObj = JSON.parse(settings.catalogue)
        if (catObj.currency) enrichedSettings.currency = String(catObj.currency)
        if (catObj.priceFormat) enrichedSettings.priceFormat = String(catObj.priceFormat)
        if (catObj.lowStockThreshold !== undefined) enrichedSettings.lowStockThreshold = String(catObj.lowStockThreshold)
        if (catObj.defaultTva !== undefined) enrichedSettings.defaultTva = String(catObj.defaultTva)
        if (catObj.productsPerPage !== undefined) enrichedSettings.productsPerPage = String(catObj.productsPerPage)
      } catch {}
    }
    if (settings.import) {
      try {
        const impObj = JSON.parse(settings.import)
        if (impObj.duplicateBehavior) enrichedSettings.duplicateBehavior = String(impObj.duplicateBehavior)
      } catch {}
    }

    const promises = Object.entries(enrichedSettings).map(([key, value]) => {
      return prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    })

    await Promise.all(promises)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Settings POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
