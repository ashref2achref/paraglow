import { randomUUID } from 'node:crypto'
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'

interface RateLimiterOptions {
  windowMs: number
  maxHits: number
}

const RATE_LIMIT_CLEANUP_INTERVAL_MS = 15 * 60 * 1000
let lastCleanupAt = 0

async function cleanupExpiredRateLimits(now: Date) {
  const nowMs = now.getTime()
  if (nowMs - lastCleanupAt < RATE_LIMIT_CLEANUP_INTERVAL_MS) return

  lastCleanupAt = nowMs
  try {
    await prisma.rateLimit.deleteMany({ where: { expiresAt: { lt: now } } })
  } catch (error) {
    console.error('[RateLimiter] Expired-row cleanup failed:', error)
  }
}

export async function isRateLimited(
  request: NextRequest | Request,
  typeKey: string,
  options: RateLimiterOptions
): Promise<boolean> {
  const ip = clientIp(request)
  const key = `${typeKey}:${ip}`
  const now = new Date()
  const expiresAt = new Date(now.getTime() + options.windowMs)

  try {
    // One PostgreSQL statement makes create/reset/increment atomic across
    // concurrent Vercel instances. This avoids the find-then-create race.
    const rows = await prisma.$queryRaw<Array<{ count: number }>>`
      INSERT INTO "RateLimit" ("id", "key", "count", "expiresAt", "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${key}, 1, ${expiresAt}, ${now}, ${now})
      ON CONFLICT ("key")
      DO UPDATE SET
        "count" = CASE
          WHEN "RateLimit"."expiresAt" <= ${now} THEN 1
          ELSE "RateLimit"."count" + 1
        END,
        "expiresAt" = CASE
          WHEN "RateLimit"."expiresAt" <= ${now} THEN ${expiresAt}
          ELSE "RateLimit"."expiresAt"
        END,
        "updatedAt" = ${now}
      RETURNING "count"
    `

    await cleanupExpiredRateLimits(now)
    return (rows[0]?.count ?? 1) > options.maxHits
  } catch (error) {
    console.error('[RateLimiter] Database operation failed:', error)
    // Availability takes precedence if the shared limiter store is temporarily unavailable.
    return false
  }
}

export function clientIp(request: NextRequest | Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()

  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  return 'unknown'
}
