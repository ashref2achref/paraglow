import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params

  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber: id },
      include: {
        items: true,
        tracking: { orderBy: { createdAt: 'asc' } },
        address: true,
      },
    })

    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 })
    }

    return Response.json({ order })
  } catch (error) {
    console.error('Order detail API error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
