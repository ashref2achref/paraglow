import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function checkAuth(request: NextRequest) {
  return checkAdminAuth(request)
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params
  try {
    const partner = await prisma.partner.findUnique({
      where: { id },
      include: {
        clients: {
          include: {
            orders: {
              where: { status: 'DELIVERED', supprime: false }
            }
          }
        }
      }
    })

    if (!partner) {
      return NextResponse.json({ error: 'Société partenaire introuvable' }, { status: 404 })
    }

    // Map clients with stats
    const clientsWithStats = partner.clients.map(c => {
      const ordersCount = c.orders.length
      const totalSpent = c.orders.reduce((sum, o) => sum + o.total, 0)
      return {
        id: c.id,
        nom: c.nom,
        prenom: c.prenom,
        phone: c.phone,
        email: c.email,
        adresse: c.adresse,
        createdAt: c.createdAt,
        ordersCount,
        totalSpent
      }
    })

    const totalOrdersCount = clientsWithStats.reduce((sum, c) => sum + c.ordersCount, 0)
    const totalSpentCA = clientsWithStats.reduce((sum, c) => sum + c.totalSpent, 0)

    return NextResponse.json({
      partner: {
        ...partner,
        clients: clientsWithStats,
        totalOrdersCount,
        totalSpentCA
      }
    })
  } catch (error) {
    console.error('Partner GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params
  try {
    const body = await request.json()
    const {
      name,
      type,
      discountType,
      discountValue,
      contactName,
      contactPhone,
      contactEmail,
      startDate,
      endDate,
      notes,
      documentUrl,
      isActive
    } = body

    const partner = await prisma.partner.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        type: type !== undefined ? type.trim() : undefined,
        discountType: discountType || undefined,
        discountValue: discountValue !== undefined ? parseFloat(String(discountValue)) : undefined,
        contactName: contactName !== undefined ? (contactName ? contactName.trim() : null) : undefined,
        contactPhone: contactPhone !== undefined ? (contactPhone ? contactPhone.trim() : null) : undefined,
        contactEmail: contactEmail !== undefined ? (contactEmail ? contactEmail.trim() : null) : undefined,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
        notes: notes !== undefined ? (notes ? notes.trim() : null) : undefined,
        documentUrl: documentUrl !== undefined ? documentUrl : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      }
    })

    return NextResponse.json({ partner })
  } catch (error: any) {
    console.error('Partner PUT error:', error)
    return NextResponse.json({ error: error.message || 'Erreur mise à jour' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params
  try {
    // Unlink clients
    await prisma.client.updateMany({
      where: { partnerId: id },
      data: { partnerId: null }
    })

    await prisma.partner.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Partner DELETE error:', error)
    return NextResponse.json({ error: error.message || 'Erreur suppression' }, { status: 500 })
  }
}
