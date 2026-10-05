import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { checkAdminAuth } from '@/lib/adminSession'
import { createClient } from '@/utils/supabase/server'
import { invalidateLayoutSettingsCache } from '@/lib/layoutSettings'
import { invalidatePreferredLocaleCache } from '@/lib/preferredLocale'
import { productImageStoragePaths, removeUnreferencedProductImagePaths } from '@/lib/productImageStorage'

export const dynamic = 'force-dynamic'

// Get all settings
export async function GET(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
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
        prefixeCommande: 'PG-',
        notificationEmail: '',
        notificationActive: false
      })
    }

    // Default livraison details
    if (!settings.livraison) {
      settings.livraison = JSON.stringify({
        standardFee: 7.0,
        expressFee: 12.0,
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    settings.admin_email = user?.email || 'admin@paraglow.tn'

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// Save settings or execute settings action
export async function POST(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
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

      const supabase = await createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
      }

      if (!user.email) {
        return NextResponse.json({ error: 'Compte administrateur invalide' }, { status: 400 })
      }

      const requestedEmail = String(email).trim().toLowerCase()
      const nextPassword = String(newPassword)

      if (!requestedEmail || requestedEmail.length > 254 || !requestedEmail.includes('@')) {
        return NextResponse.json({ error: 'Adresse e-mail invalide' }, { status: 400 })
      }

      const hasStrongPassword =
        nextPassword.length >= 12 &&
        nextPassword.length <= 128 &&
        /[a-z]/.test(nextPassword) &&
        /[A-Z]/.test(nextPassword) &&
        /\d/.test(nextPassword) &&
        /[^A-Za-z0-9]/.test(nextPassword)

      if (!hasStrongPassword) {
        return NextResponse.json({
          error: 'Le nouveau mot de passe doit contenir au moins 12 caractères, avec majuscule, minuscule, chiffre et symbole.'
        }, { status: 400 })
      }

      // Re-authenticate the currently logged-in account before changing credentials.
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      })

      if (reauthError) {
        return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 401 })
      }

      // Update email/password in Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        email: requestedEmail,
        password: nextPassword,
      })

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 })
      }

      return NextResponse.json({ success: true, message: 'Identifiants mis à jour avec succès' })
    }

    if (action === 'clear_cache') {
      invalidateLayoutSettingsCache()
      invalidatePreferredLocaleCache()
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
          products: { none: {} },
          children: { none: {} }
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
      const trashedProducts = await prisma.product.findMany({
        where: { supprime: true },
        select: { id: true, images: true, imageUrl: true },
      })
      const trashedProductIds = trashedProducts.map((product) => product.id)

      const purgeResult = await prisma.$transaction(async (tx) => {
        // Trashed orders already released their reserved stock/promo usage when
        // they were moved to the bin. Deleting them now removes their items too.
        const deletedOrders = await tx.order.deleteMany({ where: { supprime: true } })

        const remainingReferences = trashedProductIds.length > 0
          ? await tx.orderItem.findMany({
              where: { productId: { in: trashedProductIds } },
              select: { productId: true },
              distinct: ['productId'],
            })
          : []

        const blockedIds = new Set(remainingReferences.map((item) => item.productId))
        const deletableIds = trashedProductIds.filter((id) => !blockedIds.has(id))

        const deletedProducts = deletableIds.length > 0
          ? await tx.product.deleteMany({
              where: { id: { in: deletableIds }, supprime: true },
            })
          : { count: 0 }

        return {
          deletedOrders: deletedOrders.count,
          deletedProducts: deletedProducts.count,
          deletableIds,
          blockedProducts: blockedIds.size,
        }
      })

      const imagePaths = trashedProducts
        .filter((product) => purgeResult.deletableIds.includes(product.id))
        .flatMap((product) => productImageStoragePaths(product.images, product.imageUrl))

      try {
        await removeUnreferencedProductImagePaths(imagePaths, purgeResult.deletableIds)
      } catch (error) {
        console.error('[Settings purge trash image cleanup]', error)
      }

      // Auto-purge orphan categories/brands after safe product deletion.
      const { purgeOrphans } = await import('@/lib/purgeOrphans')
      await purgeOrphans()

      return NextResponse.json({
        success: true,
        message: purgeResult.blockedProducts > 0
          ? `Corbeille nettoyée : ${purgeResult.deletedProducts} produits et ${purgeResult.deletedOrders} commandes supprimés. ${purgeResult.blockedProducts} produit(s) conservé(s) car liés à des commandes actives.`
          : `Corbeille vidée : ${purgeResult.deletedProducts} produits et ${purgeResult.deletedOrders} commandes supprimés définitivement.`
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
    invalidateLayoutSettingsCache()
    invalidatePreferredLocaleCache()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Settings POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
