import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'
import path from 'node:path'

const filename = process.env.INITIAL_IMPORT_FILENAME || 'Import initial — article_organise.xlsx'
const start = process.env.INITIAL_IMPORT_START
const end = process.env.INITIAL_IMPORT_END
const apply = process.env.APPLY_INITIAL_IMPORT_ATTACH === '1'

if (!start || !end) {
  console.error('Set INITIAL_IMPORT_START and INITIAL_IMPORT_END to a narrow ISO date window before running this one-off script.')
  process.exit(1)
}

const rawUrl = process.env.DATABASE_URL || 'file:./dev.db'
const dbPath = rawUrl.replace('file:', '')
const adapter = new PrismaBetterSqlite3({
  url: path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath),
})
const prisma = new PrismaClient({ adapter })

try {
  const where = {
    importBatchId: null,
    createdAt: {
      gte: new Date(start),
      lte: new Date(end),
    },
  }

  const products = await prisma.product.findMany({
    where,
    select: { id: true, code: true, name: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`Matched ${products.length} product(s) for ${filename}.`)
  console.table(products.map((product) => ({
    code: product.code,
    name: product.name,
    createdAt: product.createdAt.toISOString(),
  })))

  if (!apply) {
    console.log('Dry run only. Re-run with APPLY_INITIAL_IMPORT_ATTACH=1 to update the database.')
    process.exit(0)
  }

  await prisma.$transaction(async (tx) => {
    const batch = await tx.importBatch.create({
      data: {
        filename,
        productsCreatedCount: products.length,
        productsUpdatedCount: 0,
      },
    })

    await tx.product.updateMany({
      where: { id: { in: products.map((product) => product.id) } },
      data: { importBatchId: batch.id },
    })
  })

  console.log(`Attached ${products.length} product(s) to ${filename}.`)
} finally {
  await prisma.$disconnect()
}
