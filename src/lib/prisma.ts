import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

// SQLite's default rollback-journal mode takes an exclusive lock on the ENTIRE
// database file for the duration of any write transaction, blocking every
// concurrent reader until it commits. This is invisible for quick admin actions
// but becomes a real production issue for anything long-running (e.g. a large
// catalogue import processing thousands of rows in chunks): every other request
// — including public storefront traffic — stalls for as long as each write
// transaction takes. Measured empirically during Chantier 7 validation: a
// concurrent request stalled ~16s during a 15,000-row import.
// WAL (Write-Ahead Logging) mode fixes this at the SQLite level: one writer and
// many readers can proceed concurrently. It's a durable property of the
// database file itself (stored in the file header), so this only needs to be
// set once — but we assert it on every startup in case dev.db is ever recreated
// fresh (e.g. a new environment) without it.
function ensureWalMode(dbPath: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Database = require('better-sqlite3')
    const conn = new Database(dbPath)
    conn.pragma('journal_mode = WAL')
    conn.close()
  } catch (e) {
    console.error('[Prisma] Failed to enable WAL mode:', e)
  }
}

function createPrismaClient(): PrismaClient {
  try {
    const rawUrl = process.env.DATABASE_URL ?? 'file:./dev.db'
    let dbPath = rawUrl.replace('file:', '')

    if (!path.isAbsolute(dbPath)) {
      dbPath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), dbPath)
    }

    ensureWalMode(dbPath)

    const adapter = new PrismaBetterSqlite3({ url: dbPath })
    return new PrismaClient({ adapter })
  } catch (e) {
    console.error('[Prisma] Adapter error:', e)
    return new PrismaClient()
  }
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
