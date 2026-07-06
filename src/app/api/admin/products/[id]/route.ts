import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'
import { revalidateAllLocales } from '@/lib/revalidate'

export const dynamic = 'force-dynamic'

function checkAuth(request: NextRequest) {
  return checkAdminAuth(request)
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
      },
    })
    if (!product) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })

    // Also fetch modifications history for this product
    const logs = await prisma.productLog.findMany({
      where: { productId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({ product, logs })
  } catch (error) {
    console.error('Admin product GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params
  try {
    const body = await request.json()
    const {
      code, barcode, name, slug, categoryId, brandId, description, descriptionAr, descriptionEn,
      purchasePriceHT, margin, tva, sellingPriceTTC, sellingPriceHT, publicPrice,
      stock, stockMin, loyaltyPoints, imageUrl, images,
      remiseType, remiseValeur, remiseVisible,
      isActive, isFeatured, isBestSeller, isNew, isOnSale,
    } = body

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
    }

    // Check code uniqueness if changed
    if (code && code !== existing.code) {
      const duplicate = await prisma.product.findUnique({ where: { code } })
      if (duplicate) {
        return NextResponse.json({ error: `Le code produit "${code}" est déjà utilisé par un autre produit.` }, { status: 400 })
      }
    }

    // Calculate changes
    const changes: Record<string, { before: any; after: any }> = {}
    const fieldsToCompare: (keyof typeof existing)[] = [
      'code', 'barcode', 'name', 'categoryId', 'brandId', 'purchasePriceHT', 'margin',
      'tva', 'sellingPriceTTC', 'stock', 'isActive', 'remiseType', 'remiseValeur', 'remiseVisible'
    ]

    fieldsToCompare.forEach((field) => {
      const prevValue = existing[field]
      const newValue = body[field] as string | number | boolean | null | undefined

      // Handle simple conversion comparison
      let isChanged = false
      if (typeof prevValue === 'number') {
        isChanged = Math.abs(prevValue - (parseFloat(String(newValue)) || 0)) > 0.0001
      } else if (typeof prevValue === 'boolean') {
        isChanged = prevValue !== (newValue === true)
      } else if (prevValue !== newValue) {
        if (!(prevValue === null && newValue === '')) {
          isChanged = true
        }
      }

      if (isChanged) {
        changes[field] = {
          before: prevValue,
          after: newValue,
        }
      }
    })

    // Helper function to handle string/relation field updates safely
    const getOptionalString = (value: any, defaultValue: string | null) => {
      if (value === undefined || value === '') return defaultValue
      return value
    }

    // Helper functions to handle number field updates safely
    const getOptionalFloat = (value: any, defaultValue: number) => {
      if (value === undefined || value === null || value === '') return defaultValue
      const parsed = parseFloat(String(value))
      return isNaN(parsed) ? defaultValue : parsed
    }

    const getOptionalInt = (value: any, defaultValue: number) => {
      if (value === undefined || value === null || value === '') return defaultValue
      const parsed = parseInt(String(value), 10)
      return isNaN(parsed) ? defaultValue : parsed
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        code: getOptionalString(code, existing.code) ?? undefined,
        barcode: getOptionalString(barcode, existing.barcode),
        name: getOptionalString(name, existing.name) ?? undefined,
        slug: getOptionalString(slug, existing.slug) ?? undefined,
        categoryId: getOptionalString(categoryId, existing.categoryId),
        brandId: getOptionalString(brandId, existing.brandId),
        description: getOptionalString(description, existing.description),
        descriptionAr: getOptionalString(descriptionAr, existing.descriptionAr),
        descriptionEn: getOptionalString(descriptionEn, existing.descriptionEn),
        purchasePriceHT: getOptionalFloat(purchasePriceHT, existing.purchasePriceHT),
        margin: getOptionalFloat(margin, existing.margin),
        tva: getOptionalFloat(tva, existing.tva),
        sellingPriceTTC: getOptionalFloat(sellingPriceTTC, existing.sellingPriceTTC),
        sellingPriceHT: getOptionalFloat(sellingPriceHT, existing.sellingPriceHT),
        publicPrice: (publicPrice === undefined || publicPrice === null || publicPrice === '') 
          ? existing.publicPrice 
          : (isNaN(parseFloat(String(publicPrice))) ? null : parseFloat(String(publicPrice))),
        stock: getOptionalInt(stock, existing.stock),
        stockMin: getOptionalInt(stockMin, existing.stockMin),
        loyaltyPoints: getOptionalInt(loyaltyPoints, existing.loyaltyPoints),
        imageUrl: getOptionalString(imageUrl, existing.imageUrl),
        images: images !== undefined ? JSON.stringify(images || []) : existing.images,
        remiseType: getOptionalString(remiseType, existing.remiseType) || 'AUCUNE',
        remiseValeur: (remiseValeur === undefined || remiseValeur === null || remiseValeur === '') 
          ? existing.remiseValeur 
          : (isNaN(parseFloat(String(remiseValeur))) ? null : parseFloat(String(remiseValeur))),
        remiseVisible: remiseVisible !== undefined ? (remiseVisible === true) : existing.remiseVisible,
        isActive: isActive !== undefined ? (isActive === true) : existing.isActive,
        isFeatured: isFeatured !== undefined ? (isFeatured === true) : existing.isFeatured,
        isBestSeller: isBestSeller !== undefined ? (isBestSeller === true) : existing.isBestSeller,
        isNew: isNew !== undefined ? (isNew === true) : existing.isNew,
        isOnSale: isOnSale !== undefined ? (isOnSale === true) : existing.isOnSale,
      },
    })

    // Log the modifications if there are changes
    if (Object.keys(changes).length > 0) {
      await prisma.productLog.create({
        data: {
          action: 'MODIFICATION',
          details: `Modification du produit ${name} (${code})`,
          productId: id,
          productName: name,
          changes: JSON.stringify(changes),
        },
      })
    }

    // Revalidate public page caches
    try {
      revalidateAllLocales('/produits')
      revalidateAllLocales(`/catalogue/${slug}`)
      revalidateAllLocales('/')
    } catch { /* ignore */ }

    return NextResponse.json({ product: updatedProduct })
  } catch (error: any) {
    console.error('Admin product PUT error:', error)
    return NextResponse.json({ error: error.message || 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params
  try {
    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })

    // Soft delete
    await prisma.product.update({
      where: { id },
      data: {
        supprime: true,
        supprimeLe: new Date(),
      },
    })

    // Log soft-deletion
    await prisma.productLog.create({
      data: {
        action: 'SUPPRESSION',
        details: `Mise en corbeille du produit ${existing.name} (${existing.code})`,
        productId: id,
        productName: existing.name,
      },
    })

    // Revalidate public page caches
    try {
      revalidateAllLocales('/produits')
      revalidateAllLocales(`/catalogue/${existing.slug}`)
      revalidateAllLocales('/')
    } catch { /* ignore */ }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin product DELETE error:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise en corbeille' }, { status: 500 })
  }
}
