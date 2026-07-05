import Image from 'next/image'
import { cn } from '@/lib/utils'

interface SiteMediaDisplayProps {
  media: {
    type: string
    url: string
    alt: string | null
    width: number | null
    height: number | null
  }
  fill?: boolean
  priority?: boolean
  sizes?: string
  className?: string
  style?: React.CSSProperties
}

export default function SiteMediaDisplay({
  media,
  fill = false,
  priority = false,
  sizes,
  className,
  style,
}: SiteMediaDisplayProps) {
  if (media.type === 'VIDEO') {
    return (
      <video
        src={media.url}
        autoPlay
        muted
        loop
        playsInline
        className={cn('object-cover', className)}
        style={{ width: '100%', height: '100%', ...style }}
      />
    )
  }

  if (fill) {
    return (
      <Image
        src={media.url}
        alt={media.alt || ''}
        fill
        priority={priority}
        sizes={sizes}
        className={cn('object-cover', className)}
        style={style}
      />
    )
  }

  return (
    <Image
      src={media.url}
      alt={media.alt || ''}
      width={media.width || 800}
      height={media.height || 600}
      priority={priority}
      sizes={sizes}
      className={cn('object-cover w-full h-auto', className)}
      style={style}
    />
  )
}
