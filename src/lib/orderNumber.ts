import type { Prisma } from '@prisma/client'

const COUNTER_ID = 'orders'
const DEFAULT_PREFIX = 'PG-2026-'

async function getOrderPrefix(tx: Prisma.TransactionClient) {
  const settingsRow = await tx.setting.findUnique({ where: { key: 'commandes' } })
  if (!settingsRow) return DEFAULT_PREFIX

  try {
    const parsed = JSON.parse(settingsRow.value) as { orderPrefix?: unknown }
    return typeof parsed.orderPrefix === 'string' && parsed.orderPrefix.trim()
      ? parsed.orderPrefix.trim()
      : DEFAULT_PREFIX
  } catch {
    return DEFAULT_PREFIX
  }
}

function parseSequence(orderNumber: string, prefix: string) {
  if (!orderNumber.startsWith(prefix)) return 0
  const parsed = Number.parseInt(orderNumber.slice(prefix.length), 10)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function generateOrderNumber(tx: Prisma.TransactionClient) {
  const prefix = await getOrderPrefix(tx)
  const latestOrder = await tx.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  })
  const maxExistingSequence = latestOrder ? parseSequence(latestOrder.orderNumber, prefix) : 0

  let counter = await tx.counter.upsert({
    where: { id: COUNTER_ID },
    update: { value: { increment: 1 } },
    create: { id: COUNTER_ID, value: maxExistingSequence + 1 },
  })

  if (counter.value <= maxExistingSequence) {
    counter = await tx.counter.update({
      where: { id: COUNTER_ID },
      data: { value: maxExistingSequence + 1 },
    })
  }

  return `${prefix}${String(counter.value).padStart(5, '0')}`
}
