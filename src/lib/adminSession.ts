import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { NextRequest, NextResponse } from 'next/server'
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  AdminSessionPayload,
  getAdminSessionSecret,
  splitAdminSessionToken,
} from './adminSessionShared'

function signPayload(payloadPart: string, secret: string) {
  return createHmac('sha256', secret).update(payloadPart).digest('base64url')
}

function safeCompare(a: string, b: string) {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer)
}

export function createAdminSessionToken() {
  const secret = getAdminSessionSecret()
  if (!secret) {
    throw new Error('SESSION_SECRET must be configured with at least 32 characters')
  }

  const now = Date.now()
  const payload: AdminSessionPayload = {
    iat: now,
    exp: now + ADMIN_SESSION_MAX_AGE_SECONDS * 1000,
    nonce: randomBytes(24).toString('base64url'),
  }
  const payloadPart = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  return `${payloadPart}.${signPayload(payloadPart, secret)}`
}

export function verifyAdminSessionToken(token: string | undefined) {
  const secret = getAdminSessionSecret()
  const parts = splitAdminSessionToken(token)
  if (!secret || !parts) return false

  const expectedSignature = signPayload(parts.payloadPart, secret)
  if (!safeCompare(parts.signaturePart, expectedSignature)) return false

  try {
    const payload = JSON.parse(Buffer.from(parts.payloadPart, 'base64url').toString('utf8')) as AdminSessionPayload
    return Number.isFinite(payload.exp) && payload.exp > Date.now()
  } catch {
    return false
  }
}

export function checkAdminAuth(request: NextRequest) {
  return verifyAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)
}

export function setAdminSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    path: '/',
  })
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
}
