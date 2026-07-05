import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'
import { revalidateAllLocales } from '@/lib/revalidate'

export const dynamic = 'force-dynamic'

function checkAuth(request: NextRequest) {
  return checkAdminAuth(request)
}

// Helper to generate a slug
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''
  const brand = searchParams.get('brand') || ''
  const stock = searchParams.get('stock') || ''
  const status = searchParams.get('status') || ''
  const image = searchParams.get('image') || ''
  const discount = searchParams.get('discount') || ''
  const sort = searchParams.get('sort') || 'newest'

  // Fetch low stock threshold setting
  let lowStockThreshold = 10
  try {
    const thresholdSetting = await prisma.setting.findUnique({ where: { key: 'lowStockThreshold' } })
    if (thresholdSetting) {
      lowStockThreshold = parseInt(thresholdSetting.value) || 10
    }
  } catch { /* ignore */ }

  const where: Record<string, any> = {
    supprime: false, // Exclude soft-deleted items by default
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
      { barcode: { contains: search } },
      { brand: { name: { contains: search } } },
    ]
  }

  if (category) {
    where.categoryId = category
  }

  if (brand) {
    where.brandId = brand
  }

  // Stock filter
  if (stock === 'out') {
    where.stock = 0
  } else if (stock === 'low') {
    where.stock = { gt: 0, lte: lowStockThreshold }
  } else if (stock === 'in') {
    where.stock = { gt: lowStockThreshold }
  }

  // Status filter (active/inactive)
  if (status === 'active') {
    where.isActive = true
  } else if (status === 'inactive') {
    where.isActive = false
  }

  // Image filter
  if (image === 'with') {
    where.OR = [
      { imageUrl: { not: null, notIn: [''] } },
      { NOT: [
        { images: null },
        { images: '[]' },
        { images: '' }
      ]}
    ]
  } else if (image === 'without') {
    where.imageUrl = { in: [null, ''] }
    where.images = { in: [null, '[]', '', 'null'] }
  }

  // Discount filter
  if (discount === 'with') {
    where.remiseType = { not: 'AUCUNE' }
  } else if (discount === 'without') {
    where.remiseType = 'AUCUNE'
  }

  // Sort logic
  let orderBy: Record<string, 'asc' | 'desc'> = { createdAt: 'desc' }
  if (sort === 'nameAsc') {
    orderBy = { name: 'asc' }
  } else if (sort === 'nameDesc') {
    orderBy = { name: 'desc' }
  } else if (sort === 'priceAsc') {
    orderBy = { sellingPriceTTC: 'asc' }
  } else if (sort === 'priceDesc') {
    orderBy = { sellingPriceTTC: 'desc' }
  } else if (sort === 'stockAsc') {
    orderBy = { stock: 'asc' }
  } else if (sort === 'stockDesc') {
    orderBy = { stock: 'desc' }
  }

  try {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
        },
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      lowStockThreshold,
    })
  } catch (error) {
    console.error('Admin products GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      code, barcode, name, slug, categoryId, brandId, description, descriptionAr, descriptionEn,
      purchasePriceHT, margin, tva, sellingPriceTTC, sellingPriceHT, publicPrice,
      stock, stockMin, loyaltyPoints, imageUrl, images,
      remiseType, remiseValeur, remiseVisible,
      isActive, isFeatured, isBestSeller, isNew, isOnSale,
    } = body

    if (!code || !name) {
      return NextResponse.json({ error: 'Code et désignation requis' }, { status: 400 })
    }

    // Check code uniqueness
    const existing = await prisma.product.findUnique({ where: { code } })
    if (existing) {
      return NextResponse.json({ error: `Le code produit "${code}" existe déjà.` }, { status: 400 })
    }

    const calculatedSlug = slug || (generateSlug(name) + '-' + code)

    const product = await prisma.product.create({
      data: {
        code,
        barcode: barcode || null,
        name,
        slug: calculatedSlug,
        categoryId: categoryId || null,
        brandId: brandId || null,
        description: description || null,
        descriptionAr: descriptionAr || null,
        descriptionEn: descriptionEn || null,
        purchasePriceHT: parseFloat(purchasePriceHT) || 0,
        margin: parseFloat(margin) || 0,
        tva: parseFloat(tva) || 19,
        sellingPriceTTC: parseFloat(sellingPriceTTC) || 0,
        sellingPriceHT: parseFloat(sellingPriceHT) || 0,
        publicPrice: publicPrice ? parseFloat(publicPrice) : null,
        stock: parseInt(stock) || 0,
        stockMin: parseInt(stockMin) || 5,
        loyaltyPoints: parseInt(loyaltyPoints) || 0,
        imageUrl: imageUrl || null,
        images: JSON.stringify(images || []),
        remiseType: remiseType || 'AUCUNE',
        remiseValeur: remiseValeur ? parseFloat(remiseValeur) : null,
        remiseVisible: remiseVisible || false,
        isActive: isActive !== false,
        isFeatured: isFeatured || false,
        isBestSeller: isBestSeller || false,
        isNew: isNew || false,
        isOnSale: isOnSale || false,
        supprime: false,
      },
    })

    // Log the creation
    await prisma.productLog.create({
      data: {
        action: 'CREATION',
        details: `Création manuelle du produit ${name} (${code})`,
        productId: product.id,
        productName: name,
      },
    })

    // Revalidate public cache
    try {
      revalidateAllLocales('/produits')
      revalidateAllLocales('/')
    } catch { /* ignore */ }

    return NextResponse.json({ product }, { status: 201 })
  } catch (error: any) {
    console.error('Admin products POST error:', error)
    return NextResponse.json({ error: error.message || 'Erreur lors de la création' }, { status: 500 })
  }
}
