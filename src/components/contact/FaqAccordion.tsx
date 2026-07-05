'use client'

import { useState } from 'react'

interface FaqItem {
  q: string
  a: string
}

interface FaqAccordionProps {
  items: FaqItem[]
}

const FaqAccordionItem = ({
  q,
  a,
  isOpen,
  onClick,
}: {
  q: string
  a: string
  isOpen: boolean
  onClick: () => void
}) => {
  return (
    <div className="bg-white rounded-xl border border-[#c9a052]/10 hover:border-[#c9a052]/30 transition-all duration-300 overflow-hidden shadow-2xs">
      <button
        onClick={onClick}
        type="button"
        className="w-full py-4 px-5 flex items-center justify-between text-start font-sans font-semibold text-[#153f2b] cursor-pointer text-sm sm:text-base"
      >
        <span>{q}</span>
        <span className="text-[#c9a052] font-serif text-lg leading-none font-medium ml-4">
          {isOpen ? "−" : "+"}
        </span>
      </button>

      <div
        className={`grid transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-4 text-xs sm:text-sm text-[#153f2b]/70 font-sans leading-relaxed border-t border-[#c9a052]/5 pt-3 bg-[#FBF6EC]/20">
            {a}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FaqAccordion({ items }: FaqAccordionProps) {
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0)

  return (
    <div className="flex flex-col gap-4 w-full">
      {items.map((item, idx) => (
        <FaqAccordionItem
          key={idx}
          q={item.q}
          a={item.a}
          isOpen={openFaqIdx === idx}
          onClick={() => setOpenFaqIdx(openFaqIdx === idx ? null : idx)}
        />
      ))}
    </div>
  )
}
