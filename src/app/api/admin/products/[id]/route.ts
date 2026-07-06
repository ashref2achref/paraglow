import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'
import { revalidateAllLocales } from '@/lib/revalidate'

export const dynamic = 'force-dynamic'

async function checkAuth(request: NextRequest) {
  return await checkAdminAuth(request);}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAuth(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
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

import { adminProductSchema } from '@/lib/validation'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAuth(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params
  try {
    const body = await request.json()
    const validated = adminProductSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 })
    }

    const {
      code, barcode, name, nameAr, nameEn, slug, categoryId, brandId, description, descriptionAr, descriptionEn,
      purchasePriceHT, margin, tva, sellingPriceTTC, sellingPriceHT, publicPrice,
      stock, stockMin, loyaltyPoints, imageUrl, images,
      remiseType, remiseValeur, remiseVisible,
      isActive, isFeatured, isBestSeller, isNew, isOnSale,
    } = validated.data

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
      'code', 'barcode', 'name', 'nameAr', 'nameEn', 'categoryId', 'brandId', 'purchasePriceHT', 'margin',
      'tva', 'sellingPriceTTC', 'stock', 'isActive', 'remiseType', 'remiseValeur', 'remiseVisible'
    ]

    fieldsToCompare.forEach((field) => {
      const prevValue = existing[field]
      const newValue = validated.data[field as keyof typeof validated.data] as string | number | boolean | null | undefined

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

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        code,
        barcode: barcode || null,
        name,
        nameAr: nameAr || null,
        nameEn: nameEn || null,
        slug: slug || undefined,
        categoryId: categoryId || null,
        brandId: brandId || null,
        description: description || null,
        descriptionAr: descriptionAr || null,
        descriptionEn: descriptionEn || null,
        purchasePriceHT,
        margin,
        tva,
        sellingPriceTTC,
        sellingPriceHT,
        publicPrice,
        stock,
        stockMin,
        loyaltyPoints,
        imageUrl: imageUrl || null,
        images: typeof images === 'string' ? images : JSON.stringify(images || []),
        remiseType,
        remiseValeur,
        remiseVisible,
        isActive,
        isFeatured,
        isBestSeller,
        isNew,
        isOnSale,
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
    console.error('Product PUT error:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du produit' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAuth(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
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
