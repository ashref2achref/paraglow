import { cn } from '@/lib/utils'
import { Image as ImageIcon } from 'lucide-react'

interface ImagePlaceholderProps {
  ratio: string
  className?: string
}

export default function ImagePlaceholder({ ratio, className }: ImagePlaceholderProps) {
  return (
    <div className={cn(
      "relative w-full overflow-hidden bg-gradient-to-br from-[#FBF6EC] to-[#F5EAD0]/40 border border-[#c9a052]/20 rounded-2xl flex flex-col items-center justify-center gap-2 p-6 shadow-inner animate-fadeIn",
      ratio,
      className
    )}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#c9a052]/5 rounded-full filter blur-xl pointer-events-none" />
      <ImageIcon className="w-8 h-8 text-[#c9a052]/60 animate-pulse relative z-10" strokeWidth={1.5} />
      <span className="text-xs font-semibold text-[#153f2b]/40 tracking-wider uppercase font-sans relative z-10">
        Image à venir
      </span>
    </div>
  )
}
