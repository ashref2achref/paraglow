import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

const VALID_SLOTS = new Set(['morning', 'afternoon', 'evening'])

function isAuthorizedCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return request.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slot: string }> }
) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const { slot } = await params
  if (!VALID_SLOTS.has(slot)) {
    return NextResponse.json(
      { ok: false, error: 'Invalid slot' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  try {
    // Intentionally tiny real query against a user table. Supabase considers
    // database activity when evaluating inactivity on Free projects.
    const settingsCount = await prisma.setting.count()

    return NextResponse.json(
      {
        ok: true,
        service: 'supabase',
        slot,
        settingsCount,
        checkedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (error) {
    console.error('[Supabase keep-alive]', error)
    return NextResponse.json(
      { ok: false, error: 'Database unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
