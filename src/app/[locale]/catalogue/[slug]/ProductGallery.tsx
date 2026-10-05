'use client'

import { useMemo, useState } from 'react'
import { Maximize2, X } from 'lucide-react'
import ProductImage from '@/components/ui/ProductImage'
import { cn } from '@/lib/utils'

function parseImages(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  } catch {
    if (value.trim()) return [value.trim()]
  }
  return []
}

export default function ProductGallery({ images, alt }: { images?: string | null; alt: string }) {
  const items = useMemo(() => parseImages(images), [images])
  const gallery = items.length > 0 ? items : ['/images/paraglow-favicon-512.png']
  const [selected, setSelected] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const current = gallery[Math.min(selected, gallery.length - 1)]

  return (
    <>
      <div className="space-y-3">
        <div className="relative aspect-square overflow-hidden rounded-[1.75rem] border border-[#c9a052]/12 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,1),rgba(251,246,236,.82))] group">
          <ProductImage
            src={current}
            alt={alt}
            fill
            className="object-contain p-6 sm:p-10 transition-transform duration-700 group-hover:scale-[1.035]"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
          <button
            type="button"
            onClick={() => setZoomed(true)}
            className="absolute top-4 end-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur border border-[#c9a052]/15 shadow-sm text-[#153f2b] hover:text-[#c9a052] flex items-center justify-center cursor-pointer transition-all"
            aria-label="Zoom image"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <div className="absolute bottom-4 start-4 px-2.5 py-1 rounded-full bg-white/85 backdrop-blur border border-white text-[10px] font-bold text-[#153f2b]/60">
            {selected + 1} / {gallery.length}
          </div>
        </div>

        {gallery.length > 1 && (
          <div className="grid grid-cols-5 gap-2">
            {gallery.slice(0, 5).map((src, index) => (
              <button
                type="button"
                key={src + index}
                onClick={() => setSelected(index)}
                className={cn(
                  'relative aspect-square rounded-xl overflow-hidden bg-white border transition-all cursor-pointer',
                  selected === index ? 'border-[#c9a052] ring-2 ring-[#c9a052]/15' : 'border-[#c9a052]/10 hover:border-[#c9a052]/40'
                )}
                aria-label={`Image ${index + 1}`}
              >
                <ProductImage src={src} alt={`${alt} ${index + 1}`} fill className="object-contain p-1.5" sizes="96px" />
              </button>
            ))}
          </div>
        )}
      </div>

      {zoomed && (
        <div className="fixed inset-0 z-[120] bg-[#06110c]/85 backdrop-blur-lg p-4 sm:p-8 flex items-center justify-center" onClick={() => setZoomed(false)}>
          <button
            type="button"
            onClick={() => setZoomed(false)}
            className="absolute top-5 end-5 w-11 h-11 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center cursor-pointer hover:bg-white/20"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="relative w-full max-w-4xl h-[80vh]" onClick={(event) => event.stopPropagation()}>
            <ProductImage src={current} alt={alt} fill className="object-contain" sizes="90vw" priority />
          </div>
        </div>
      )}
    </>
  )
}
