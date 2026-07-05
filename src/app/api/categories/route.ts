import prisma from '@/lib/prisma'

export const revalidate = 300

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
        parentId: null,
        products: {
          some: {
            isActive: true,
            supprime: false
          }
        }
      },
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { products: { where: { isActive: true, supprime: false } } } },
      },
    })

    return Response.json({ categories })
  } catch (error) {
    console.error('Categories API error:', error)
    return Response.json({ categories: [] })
  }
}
