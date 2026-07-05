import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in your .env file.')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function syncUsers() {
  try {
    const localUsers = await prisma.user.findMany()
    console.log(`Found ${localUsers.length} users to sync...`)

    for (const user of localUsers) {
      console.log(`\n--------------------------------------------`)
      console.log(`Processing: ${user.email} (Role: ${user.role})...`)

      // Option A: Send a secure invitation email to the user.
      // This creates the account in auth.users and triggers Supabase to send
      // an invite/confirmation link where they can safely set their password.
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(user.email, {
        data: {
          name: user.name || '',
          role: user.role,
        }
      })

      if (error) {
        // If the user already exists in auth.users, map them to avoid conflicts
        if (error.message.includes('already exists') || error.message.includes('unique constraint')) {
          console.log(`User ${user.email} already exists in auth.users. Fetching details...`)
          
          // Generate a secure recovery link instead
          const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: user.email,
          })

          if (linkError) {
            console.error(`Failed to generate recovery link for ${user.email}:`, linkError.message)
            continue
          }

          // Fetch user info to update local database with the correct UUID
          const { data: listData, error: listError } = await supabase.auth.admin.listUsers()
          if (listError) {
            console.error('Error listing users:', listError.message)
            continue
          }

          const existingUser = listData.users.find(u => u.email === user.email)
          if (existingUser) {
            await prisma.user.update({
              where: { email: user.email },
              data: { id: existingUser.id }
            })
            console.log(`✅ Successfully mapped existing user ${user.email} to ID: ${existingUser.id}`)
            console.log(`🔗 Recovery link for password reset: ${linkData.properties.action_link}`)
          }
        } else {
          console.error(`❌ Error inviting user ${user.email}:`, error.message)
        }
      } else if (data && data.user) {
        // Update user ID in public.User to match Supabase UUID
        await prisma.user.update({
          where: { email: user.email },
          data: { id: data.user.id }
        })
        console.log(`✅ Successfully invited ${user.email}. Sync profile updated to Supabase UUID: ${data.user.id}`)
      }
    }
  } catch (err) {
    console.error('Migration failed:', err)
  } finally {
    await prisma.$disconnect()
  }
}

syncUsers()
