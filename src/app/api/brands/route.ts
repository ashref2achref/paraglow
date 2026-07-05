import prisma from '@/lib/prisma'

export const revalidate = 300

export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      where: {
        isActive: true,
        products: {
          some: {
            isActive: true,
            supprime: false
          }
        }
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        _count: {
          select: {
            products: {
              where: { isActive: true, supprime: false }
            }
          }
        }
      }
    })

    return Response.json({ brands })
  } catch (error) {
    console.error('Brands API error:', error)
    return Response.json({ brands: [] }, { status: 200 })
  }
}
