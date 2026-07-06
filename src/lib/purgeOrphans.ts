import prisma from './prisma'

export async function purgeOrphans() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  // 1. Purge subcategories (with parentId)
  const subCategories = await prisma.category.deleteMany({
    where: {
      parentId: { not: null },
      products: { none: {} },
      createdAt: { lt: oneDayAgo }
    }
  })

  // 2. Purge parent categories (parentId null)
  const parentCategories = await prisma.category.deleteMany({
    where: {
      parentId: null,
      products: { none: {} },
      children: { none: {} },
      createdAt: { lt: oneDayAgo }
    }
  })

  // 3. Purge brands
  const brands = await prisma.brand.deleteMany({
    where: {
      products: { none: {} },
      createdAt: { lt: oneDayAgo }
    }
  })

  // Revalidate public pages
  try {
    const { revalidateAllLocales } = await import('./revalidate')
    revalidateAllLocales('/')
    revalidateAllLocales('/catalogue')
  } catch (error) {
    console.error('Error revalidating paths after orphan purge:', error)
  }

  return {
    deletedCategories: subCategories.count + parentCategories.count,
    deletedBrands: brands.count
  }
}
