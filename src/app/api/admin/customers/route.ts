import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'
import { adminCustomerSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

async function checkAuth(request: NextRequest) {
  return await checkAdminAuth(request)
}

const SORT_CLAUSES: Record<string, string> = {
  nameAsc: 'c."prenom" ASC, c."nom" ASC',
  nameDesc: 'c."prenom" DESC, c."nom" DESC',
  totalDesc: '"totalSpent" DESC',
  totalAsc: '"totalSpent" ASC',
  lastOrder: '"lastOrderDate" DESC NULLS LAST',
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
  partnerName: string | null
  createdAt: Date
  supprime: boolean
  supprimeLe: Date | null
  totalSpent: number
  ordersCount: number
  lastOrderDate: Date | null
}

function boundedInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value || '', 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

export async function GET(request: NextRequest) {
  if (!(await checkAuth(request))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const page = boundedInt(searchParams.get('page'), 1, 100_000)
  const limit = boundedInt(searchParams.get('limit'), 20, 100_000)
  const skip = (page - 1) * limit
  const search = (searchParams.get('search') || '').trim()
  const sort = searchParams.get('sort') || 'nameAsc'
  const trash = searchParams.get('trash') === 'true'

  const orderByClause = SORT_CLAUSES[sort] || SORT_CLAUSES.nameAsc
  const searchPattern = `%${search}%`
  const searchFilter = search
    ? Prisma.sql`AND (
        c."nom" ILIKE ${searchPattern}
        OR c."prenom" ILIKE ${searchPattern}
        OR c."phone" ILIKE ${searchPattern}
        OR COALESCE(c."email", '') ILIKE ${searchPattern}
      )`
    : Prisma.empty

  try {
    const totalRows = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS "count"
      FROM "Client" c
      WHERE c."supprime" = ${trash}
      ${searchFilter}
    `)
    const total = Number(totalRows[0]?.count ?? 0)

    const rows = await prisma.$queryRaw<RawCustomerRow[]>(Prisma.sql`
      SELECT
        c."id",
        c."nom",
        c."prenom",
        c."phone",
        c."email",
        c."adresse",
        c."wilaya",
        c."notes",
        c."partnerId",
        p."name" AS "partnerName",
        c."createdAt",
        c."supprime",
        c."supprimeLe",
        COALESCE(
          SUM(CASE WHEN o."status" = 'DELIVERED' AND o."supprime" = false THEN o."total" ELSE 0 END),
          0
        )::double precision AS "totalSpent",
        COALESCE(
          SUM(CASE WHEN o."status" = 'DELIVERED' AND o."supprime" = false THEN 1 ELSE 0 END),
          0
        )::integer AS "ordersCount",
        MAX(
          CASE WHEN o."status" = 'DELIVERED' AND o."supprime" = false THEN o."createdAt" ELSE NULL END
        ) AS "lastOrderDate"
      FROM "Client" c
      LEFT JOIN "Order" o ON o."clientId" = c."id"
      LEFT JOIN "Partner" p ON p."id" = c."partnerId"
      WHERE c."supprime" = ${trash}
      ${searchFilter}
      GROUP BY c."id", p."name"
      ORDER BY ${Prisma.raw(orderByClause)}
      LIMIT ${limit}
      OFFSET ${skip}
    `)

    const customers = rows.map((customer) => ({
      ...customer,
      totalSpent: Number(customer.totalSpent),
      ordersCount: Number(customer.ordersCount),
    }))

    return NextResponse.json({
      customers,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    })
  } catch (error) {
    console.error('Admin clients GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!(await checkAuth(request))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const validated = adminCustomerSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 })
    }

    const { nom, prenom, phone, email, adresse, wilaya, notes, partnerId } = validated.data

    const existing = await prisma.client.findUnique({ where: { phone } })
    if (existing) {
      return NextResponse.json(
        { error: 'Ce numéro de téléphone est déjà attribué à un autre client' },
        { status: 400 }
      )
    }

    const client = await prisma.client.create({
      data: {
        nom,
        prenom: prenom || '',
        phone,
        email: email || null,
        adresse: adresse || null,
        wilaya: wilaya || null,
        notes: notes || null,
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
  } catch (error: unknown) {
    console.error('Admin client POST error:', error)
    return NextResponse.json({ error: 'Erreur lors de la création du client' }, { status: 500 })
  }
}
