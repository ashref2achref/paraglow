import type { Prisma } from '@prisma/client'
import crypto from 'crypto'

export async function generateOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  
  // Generate 6 random alphanumeric characters
  while (code.length < 6) {
    const bytes = crypto.randomBytes(6)
    for (let i = 0; i < bytes.length && code.length < 6; i++) {
      const idx = bytes[i] % chars.length
      code += chars[idx]
    }
  }

  const orderNumber = `PG-${code}`

  // Check uniqueness in database to avoid collisions
  const existing = await tx.order.findUnique({
    where: { orderNumber },
    select: { id: true }
  })

  if (existing) {
    return generateOrderNumber(tx)
  }

  return orderNumber
}

