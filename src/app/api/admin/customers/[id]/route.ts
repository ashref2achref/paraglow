import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function checkAuth(request: NextRequest) {
  return await checkAdminAuth(request);}

// GET: Retrieve single Client details and full history of orders
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAuth(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params

  try {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        orders: {
          where: { supprime: false },
          orderBy: { createdAt: 'desc' },
          include: { items: true }
        }
      }
    })

    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    const deliveredOrders = client.orders.filter(o => o.status === 'DELIVERED')
    const totalSpent = deliveredOrders.reduce((sum, o) => sum + o.total, 0)
    const ordersCount = deliveredOrders.length
    const averageOrderValue = ordersCount > 0 ? (totalSpent / ordersCount) : 0

    return NextResponse.json({
      customer: {
        ...client,
        totalSpent,
        ordersCount,
        averageOrderValue,
      }
    })
  } catch (error) {
    console.error('Admin client GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

import { adminCustomerSchema } from '@/lib/validation'

// PUT: Update Client profile details
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAuth(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params

  try {
    const body = await request.json()
    const validated = adminCustomerSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 })
    }

    const { nom, prenom, phone, email, adresse, wilaya, notes, partnerId } = validated.data

    const current = await prisma.client.findUnique({ where: { id } })
    if (!current) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    // Check if phone number is already taken by another client
    const existing = await prisma.client.findFirst({
      where: {
        phone,
        NOT: { id }
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'Ce numéro de téléphone est déjà attribué à un autre client' }, { status: 400 })
    }

    const nextValues = {
      nom,
      prenom: prenom || '',
      phone,
      email: email || null,
      adresse: adresse || null,
      wilaya: wilaya || null,
      notes: notes || null,
      partnerId: partnerId === '' ? null : (partnerId || null),
    }

    const changes: Record<string, { before: unknown; after: unknown }> = {}
    for (const key of ['nom', 'prenom', 'phone', 'email', 'adresse', 'wilaya', 'notes', 'partnerId'] as const) {
      const before = current[key]
      const after = nextValues[key]
      if (before !== after) changes[key] = { before, after }
    }

    const updated = await prisma.client.update({
      where: { id },
      data: nextValues,
    })

    if (Object.keys(changes).length > 0) {
      await prisma.clientLog.create({
        data: {
          action: 'MODIFICATION',
          details: `Fiche client de ${updated.prenom} ${updated.nom} modifiée (${Object.keys(changes).join(', ')})`,
          changes: JSON.stringify(changes),
          clientId: id,
          clientName: `${updated.prenom} ${updated.nom}`,
        },
      })
    }

    return NextResponse.json({ customer: updated })
  } catch (error: any) {
    console.error('Admin client PUT error:', error)
    console.error('Customer PUT error:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du client' }, { status: 500 })
  }
}

// DELETE: Soft-deletes the Client (moves it to the corbeille). Permanent deletion only
// happens from the corbeille itself, via /api/admin/customers/trash.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAuth(request))) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params

  try {
    const client = await prisma.client.findUnique({ where: { id } })
    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    if (client.supprime) {
      return NextResponse.json({ error: 'Client déjà dans la corbeille' }, { status: 400 })
    }

    await prisma.client.update({
      where: { id },
      data: { supprime: true, supprimeLe: new Date() },
    })

    await prisma.clientLog.create({
      data: {
        action: 'SUPPRESSION',
        details: `Mise en corbeille du client ${client.prenom} ${client.nom} (${client.phone})`,
        clientId: id,
        clientName: `${client.prenom} ${client.nom}`,
      },
    })

    return NextResponse.json({ success: true, message: 'Client mis à la corbeille' })
  } catch (error: any) {
    console.error('Admin client DELETE error:', error)
    console.error('Customer DELETE error:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression du client' }, { status: 500 })
  }
}
