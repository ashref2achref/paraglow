import type { NextRequest } from 'next/server'
import {
  ADMIN_SESSION_COOKIE,
  AdminSessionPayload,
  getAdminSessionSecret,
  splitAdminSessionToken,
} from './adminSessionShared'

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

async function signPayload(payloadPart: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadPart))
  return bytesToBase64Url(new Uint8Array(signature))
}

export async function verifyAdminSessionTokenEdge(token: string | undefined) {
  const secret = getAdminSessionSecret()
  const parts = splitAdminSessionToken(token)
  if (!secret || !parts) return false

  const expectedSignature = await signPayload(parts.payloadPart, secret)
  if (!constantTimeEqual(parts.signaturePart, expectedSignature)) return false

  try {
    const payloadText = new TextDecoder().decode(base64UrlToBytes(parts.payloadPart))
    const payload = JSON.parse(payloadText) as AdminSessionPayload
    return Number.isFinite(payload.exp) && payload.exp > Date.now()
  } catch {
    return false
  }
}

export async function checkAdminAuthEdge(request: NextRequest) {
  return verifyAdminSessionTokenEdge(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)
}
