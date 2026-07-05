import { cn } from '@/lib/utils'
import React from 'react'

export default function Container({
  children,
  className,
  as: Component = 'div',
}: {
  children: React.ReactNode
  className?: string
  as?: React.ElementType
}) {
  return (
    <Component
      className={cn(
        'w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 xl:px-16',
        className
      )}
    >
      {children}
    </Component>
  )
}
