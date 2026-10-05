import type { Prisma } from '@prisma/client'
import crypto from 'crypto'

const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const RANDOM_LENGTH = 10
const MAX_ATTEMPTS = 5

function randomCode(length = RANDOM_LENGTH) {
  let code = ''
  while (code.length < length) {
    const bytes = crypto.randomBytes(length)
    for (const byte of bytes) {
      if (code.length >= length) break
      code += ALPHANUMERIC[byte % ALPHANUMERIC.length]
    }
  }
  return code
}

export async function generateOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const orderNumber = `PG-${randomCode()}`
    const existing = await tx.order.findUnique({
      where: { orderNumber },
      select: { id: true },
    })
    if (!existing) return orderNumber
  }

  // Practically unreachable, but guarantees forward progress without recursion.
  return `PG-${crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`
}
