import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'
import fs from 'fs'
import bcrypt from 'bcryptjs'

// Simple manual loader for .env to avoid external dependencies if not installed
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env')
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8')
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
          const index = trimmed.indexOf('=')
          if (index !== -1) {
            const key = trimmed.substring(0, index).trim()
            let value = trimmed.substring(index + 1).trim()
            // Remove wrapping quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
              value = value.substring(1, value.length - 1)
            }
            process.env[key] = value
          }
        }
      }
    }
  } catch (err) {
    console.error('Error loading .env file:', err)
  }
}

async function main() {
  loadEnv()

  const args = process.argv.slice(2)
  if (args.length < 2) {
    console.log('\n❌ Usage: npx tsx scripts/reset-admin.ts <email> <password>\n')
    process.exit(1)
  }

  const email = args[0].trim()
  const password = args[1].trim()

  if (!email || !password) {
    console.error('Email and password must not be empty.')
    process.exit(1)
  }

  console.log(`Setting admin email to: ${email}`)

  const rawUrl = process.env.DATABASE_URL ?? 'file:./dev.db'
  let dbPath = rawUrl.replace('file:', '')
  if (!path.isAbsolute(dbPath)) {
    dbPath = path.resolve(process.cwd(), dbPath)
  }

  console.log(`Using database at: ${dbPath}`)

  const adapter = new PrismaBetterSqlite3({ url: dbPath })
  const prisma = new PrismaClient({ adapter })

  try {
    const passwordHash = bcrypt.hashSync(password, 10)

    // Upsert admin_email setting
    await prisma.setting.upsert({
      where: { key: 'admin_email' },
      update: { value: email },
      create: { key: 'admin_email', value: email }
    })

    // Upsert admin_password_hash setting
    await prisma.setting.upsert({
      where: { key: 'admin_password_hash' },
      update: { value: passwordHash },
      create: { key: 'admin_password_hash', value: passwordHash }
    })

    console.log('\n✅ Admin credentials have been reset successfully!')
  } catch (error) {
    console.error('\n❌ Error resetting admin credentials:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
