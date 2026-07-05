import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function checkAuth(request: NextRequest) {
  return checkAdminAuth(request)
}

// Whitelisted ORDER BY clauses only — never built from raw user input.
const SORT_CLAUSES: Record<string, string> = {
  nameAsc: 'c.prenom ASC, c.nom ASC',
  nameDesc: 'c.prenom DESC, c.nom DESC',
  totalDesc: 'totalSpent DESC',
  totalAsc: 'totalSpent ASC',
  lastOrder: 'lastOrderDate DESC',
}

type RawCustomerRow = {
  id: string
  nom: string
  prenom: string
  phone: string
  email: string | null
  adresse: string | null
  wilaya: string | null
  notes: string | null
  partnerId: string | null
  createdAt: string
  supprime: number
  supprimeLe: string | null
  totalSpent: number
  ordersCount: number
  lastOrderDate: string | null
}

// GET all clients with total purchases, delivered orders count, search, sort and trash filter.
// Uses a SQL aggregate (GROUP BY) + LIMIT/OFFSET so we never load every client and every one of
// their orders into memory just to paginate in JS (see audit: this was the previous behavior).
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit
  const search = searchParams.get('search') || ''
  const sort = searchParams.get('sort') || 'nameAsc'
  const trash = searchParams.get('trash') === 'true'

  const orderByClause = SORT_CLAUSES[sort] || SORT_CLAUSES.nameAsc
  const searchPattern = `%${search}%`
  const whereSearch = search ? `AND (c.nom LIKE ? OR c.prenom LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)` : ''
  const searchArgs = search ? [searchPattern, searchPattern, searchPattern, searchPattern] : []

  try {
    const totalRow = await prisma.$queryRawUnsafe<{ count: number }[]>(
      `SELECT COUNT(*) as count FROM Client c WHERE c.supprime = ? ${whereSearch}`,
      trash ? 1 : 0,
      ...searchArgs
    )
    const total = Number(totalRow[0]?.count || 0)

    const rows = await prisma.$queryRawUnsafe<RawCustomerRow[]>(
      `SELECT
        c.id, c.nom, c.prenom, c.phone, c.email, c.adresse, c.wilaya, c.notes, c.partnerId,
        c.createdAt, c.supprime, c.supprimeLe,
        COALESCE(SUM(CASE WHEN o.status = 'DELIVERED' AND o.supprime = 0 THEN o.total ELSE 0 END), 0) as totalSpent,
        COALESCE(SUM(CASE WHEN o.status = 'DELIVERED' AND o.supprime = 0 THEN 1 ELSE 0 END), 0) as ordersCount,
        MAX(CASE WHEN o.status = 'DELIVERED' AND o.supprime = 0 THEN o.createdAt ELSE NULL END) as lastOrderDate
      FROM Client c
      LEFT JOIN "Order" o ON o.clientId = c.id
      WHERE c.supprime = ? ${whereSearch}
      GROUP BY c.id
      ORDER BY ${orderByClause}
      LIMIT ? OFFSET ?`,
      trash ? 1 : 0,
      ...searchArgs,
      limit,
      skip
    )

    const customers = rows.map((c) => ({
      ...c,
      supprime: !!c.supprime,
      totalSpent: Number(c.totalSpent),
      ordersCount: Number(c.ordersCount),
    }))

    return NextResponse.json({
      customers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Admin clients GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST: manually create a client from the admin (not tied to an order)
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const body = await request.json()
    const { nom, prenom, phone, email, adresse, wilaya, notes, partnerId } = body

    const cleanPhone = typeof phone === 'string' ? phone.trim() : ''
    const cleanNom = typeof nom === 'string' ? nom.trim() : ''

    if (!cleanNom || !cleanPhone) {
      return NextResponse.json({ error: 'Le nom et le téléphone sont requis' }, { status: 400 })
    }

    const existing = await prisma.client.findUnique({ where: { phone: cleanPhone } })
    if (existing) {
      return NextResponse.json({ error: 'Ce numéro de téléphone est déjà attribué à un autre client' }, { status: 400 })
    }

    const client = await prisma.client.create({
      data: {
        nom: cleanNom,
        prenom: typeof prenom === 'string' ? prenom.trim() : '',
        phone: cleanPhone,
        email: email ? String(email).trim() : null,
        adresse: adresse ? String(adresse).trim() : null,
        wilaya: wilaya ? String(wilaya).trim() : null,
        notes: notes ? String(notes).trim() : null,
        partnerId: partnerId || null,
      },
    })

    await prisma.clientLog.create({
      data: {
        action: 'CREATION',
        details: `Client ${client.prenom} ${client.nom} (${client.phone}) ajouté manuellement depuis l'admin.`,
        clientId: client.id,
        clientName: `${client.prenom} ${client.nom}`,
      },
    })

    return NextResponse.json({ customer: client }, { status: 201 })
  } catch (error: any) {
    console.error('Admin client POST error:', error)
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 })
  }
}
