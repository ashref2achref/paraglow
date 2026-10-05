'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Leaf } from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolveProductImage } from '@/lib/productImage'

interface ProductImageProps {
  src?: unknown
  alt: string
  fill?: boolean
  width?: number
  height?: number
  className?: string
  sizes?: string
  priority?: boolean
}

export default function ProductImage({
  src,
  alt,
  fill = true,
  width,
  height,
  className,
  sizes,
  priority = false,
}: ProductImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const resolved = resolveProductImage(src)
  const hasError = !!resolved && failedSrc === resolved

  if (hasError || !resolved) {
    return (
      <div 
        className={cn(
          "w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#FBF6EC] to-[#eadfca]/20 rounded-xl p-4 select-none",
          className
        )}
      >
        <Leaf className="w-8 h-8 text-[#c9a052]/35" strokeWidth={1.5} />
      </div>
    )
  }

  return (
    <Image
      src={resolved}
      alt={alt || 'Produit ParaGlow'}
      fill={fill}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      sizes={sizes}
      priority={priority}
      onError={() => setFailedSrc(resolved)}
      className={cn("object-contain p-2 bg-[#FBF6EC]/30 rounded-xl", className)}
    />
  )
}
