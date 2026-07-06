import prisma from '@/lib/prisma'
import { normalizeTunisianPhone } from '@/lib/phone'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const { searchParams } = new URL(req.url)
  const rawPhone = searchParams.get('phone') || ''
  
  const phoneInput = normalizeTunisianPhone(rawPhone)

  if (!phoneInput) {
    return Response.json({ error: 'Numéro de téléphone requis' }, { status: 400 })
  }

  try {
    const order = await prisma.order.findFirst({
      where: {
        orderNumber: id,
        supprime: false,
        OR: [
          { guestPhone: phoneInput },
          { client: { phone: phoneInput } }
        ]
      },
      include: {
        items: true,
        tracking: { orderBy: { createdAt: 'asc' } },
        address: true,
      },
    })

    if (!order) {
      return Response.json({ error: 'Commande introuvable' }, { status: 404 })
    }

    return Response.json({ order })
  } catch (error) {
    console.error('Order detail API error:', error)
    return Response.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

