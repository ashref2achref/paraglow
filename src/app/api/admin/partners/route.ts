import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function checkAuth(request: NextRequest) {
  return await checkAdminAuth(request);}

export async function GET(request: NextRequest) {
  if (!(await checkAuth(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  try {
    const partners = await prisma.partner.findMany({
      orderBy: { createdAt: 'desc' },
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

    // Map stats (clients count, orders count, total spent)
    const partnersWithStats = partners.map(p => {
      const clientsCount = p.clients.length
      let ordersCount = 0
      let totalSpent = 0
      p.clients.forEach(c => {
        ordersCount += c.orders.length
        totalSpent += c.orders.reduce((sum, o) => sum + o.total, 0)
      })

      return {
        id: p.id,
        name: p.name,
        type: p.type,
        discountType: p.discountType,
        discountValue: p.discountValue,
        contactName: p.contactName,
        contactPhone: p.contactPhone,
        contactEmail: p.contactEmail,
        startDate: p.startDate,
        endDate: p.endDate,
        notes: p.notes,
        documentUrl: p.documentUrl,
        isActive: p.isActive,
        createdAt: p.createdAt,
        clientsCount,
        ordersCount,
        totalSpent
      }
    })

    return NextResponse.json({ partners: partnersWithStats })
  } catch (error) {
    console.error('Partners GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!(await checkAuth(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
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

    if (!name || discountValue === undefined || !type) {
      return NextResponse.json({ error: 'Nom, type et valeur de remise requis' }, { status: 400 })
    }

    const uppercaseName = name.trim()
    const existing = await prisma.partner.findUnique({ where: { name: uppercaseName } })
    if (existing) {
      return NextResponse.json({ error: 'Cette société partenaire existe déjà' }, { status: 400 })
    }

    const partner = await prisma.partner.create({
      data: {
        name: uppercaseName,
        type: type.trim(),
        discountType: discountType || 'PERCENTAGE',
        discountValue: parseFloat(String(discountValue)),
        contactName: contactName ? contactName.trim() : null,
        contactPhone: contactPhone ? contactPhone.trim() : null,
        contactEmail: contactEmail ? contactEmail.trim() : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        notes: notes ? notes.trim() : null,
        documentUrl: documentUrl || null,
        isActive: isActive !== false,
      }
    })

    return NextResponse.json({ partner }, { status: 201 })
  } catch (error: any) {
    console.error('Partner POST error:', error)
    console.error('Partner POST error:', error);
    return NextResponse.json({ error: 'Erreur lors de la création du partenaire' }, { status: 500 })
  }
}
