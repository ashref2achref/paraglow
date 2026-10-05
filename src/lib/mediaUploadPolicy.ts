import prisma from '@/lib/prisma'

export const MAX_SERVERLESS_IMAGE_MB = 4
export const DEFAULT_VIDEO_UPLOAD_MB = 25
export const MAX_DIRECT_VIDEO_MB = 100

const DEFAULT_IMAGE_QUALITY = 85
const DEFAULT_ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const DEFAULT_ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm']

export async function getMediaUploadPolicy() {
  let imageQuality = DEFAULT_IMAGE_QUALITY
  let maxImageSizeMB = MAX_SERVERLESS_IMAGE_MB
  let maxVideoSizeMB = DEFAULT_VIDEO_UPLOAD_MB
  let allowedImageTypes = DEFAULT_ALLOWED_IMAGE_TYPES
  let allowedVideoTypes = DEFAULT_ALLOWED_VIDEO_TYPES

  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'photosSite' } })
    if (setting) {
      const parsed = JSON.parse(setting.value) as {
        imageQuality?: unknown
        maxImageSizeMB?: unknown
        maxVideoSizeMB?: unknown
        allowedImageTypes?: unknown
        allowedVideoTypes?: unknown
      }

      if (Number.isFinite(Number(parsed.imageQuality))) {
        imageQuality = Math.min(100, Math.max(1, Number(parsed.imageQuality)))
      }
      if (Number.isFinite(Number(parsed.maxImageSizeMB))) {
        maxImageSizeMB = Math.min(MAX_SERVERLESS_IMAGE_MB, Math.max(1, Number(parsed.maxImageSizeMB)))
      }
      if (Number.isFinite(Number(parsed.maxVideoSizeMB))) {
        maxVideoSizeMB = Math.min(MAX_DIRECT_VIDEO_MB, Math.max(1, Number(parsed.maxVideoSizeMB)))
      }
      if (typeof parsed.allowedImageTypes === 'string' && parsed.allowedImageTypes.trim()) {
        allowedImageTypes = parsed.allowedImageTypes.split(',').map((value) => value.trim()).filter(Boolean)
      }
      if (typeof parsed.allowedVideoTypes === 'string' && parsed.allowedVideoTypes.trim()) {
        allowedVideoTypes = parsed.allowedVideoTypes.split(',').map((value) => value.trim()).filter(Boolean)
      }
    }
  } catch {
    // Keep safe defaults if settings are malformed or unavailable.
  }

  return {
    imageQuality,
    maxImageSizeMB,
    maxVideoSizeMB,
    maxImageSize: maxImageSizeMB * 1024 * 1024,
    maxVideoSize: maxVideoSizeMB * 1024 * 1024,
    allowedImageTypes,
    allowedVideoTypes,
  }
}
