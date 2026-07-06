import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'

interface RateLimiterOptions {
  windowMs: number
  maxHits: number
}

export async function isRateLimited(
  request: NextRequest | Request,
  typeKey: string,
  options: RateLimiterOptions
): Promise<boolean> {
  const ip = clientIp(request)
  const key = `${typeKey}:${ip}`
  const now = new Date()

  // 1. Clean expired entries at the moment of request to avoid database bloat
  try {
    await prisma.rateLimit.deleteMany({
      where: {
        expiresAt: { lt: now }
      }
    })
  } catch (error) {
    console.error('[RateLimiter] Error cleaning expired entries:', error)
  }

  try {
    // 2. Retrieve or update the rate limit record
    const record = await prisma.rateLimit.findUnique({
      where: { key }
    })

    if (!record) {
      // First hit in this window: create record
      const expiresAt = new Date(now.getTime() + options.windowMs)
      await prisma.rateLimit.create({
        data: {
          key,
          count: 1,
          expiresAt
        }
      })
      return false
    }

    if (now > record.expiresAt) {
      // The window has expired: reset count and expiresAt
      const expiresAt = new Date(now.getTime() + options.windowMs)
      await prisma.rateLimit.update({
        where: { key },
        data: {
          count: 1,
          expiresAt
        }
      })
      return false
    }

    // Still within window: increment hits
    const updated = await prisma.rateLimit.update({
      where: { key },
      data: {
        count: { increment: 1 }
      }
    })

    // Return true if hits exceeded maxHits
    return updated.count > options.maxHits
  } catch (error) {
    console.error('[RateLimiter] Database operation failed:', error)
    // Fail-open: if database fails, allow the request to prevent blocking normal users
    return false
  }
}

export function clientIp(request: NextRequest | Request): string {
  // Safe helper to extract headers from both Request and NextRequest
  const headers = 'headers' in request 
    ? (request.headers instanceof Headers ? request.headers : new Headers(request.headers as any))
    : new Headers()

  const fwd = headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  
  const realIp = headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  return 'unknown'
}
