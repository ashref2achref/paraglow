import prisma from './prisma'

export type AdminCredentials = {
  email: string
  passwordHash: string | null
}

export async function getAdminCredentials(): Promise<AdminCredentials> {
  let email = process.env.ADMIN_EMAIL?.trim() || 'admin@paraglow.tn'
  let passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim() || null

  try {
    const [emailSetting, hashSetting] = await Promise.all([
      prisma.setting.findUnique({ where: { key: 'admin_email' } }),
      prisma.setting.findUnique({ where: { key: 'admin_password_hash' } }),
    ])
    if (emailSetting?.value) email = emailSetting.value
    if (hashSetting?.value) passwordHash = hashSetting.value
  } catch {}

  return { email, passwordHash }
}
