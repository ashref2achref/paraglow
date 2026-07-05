'use client'

import React, { useEffect, useRef, useState } from 'react'

interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
  delay?: number // in seconds
  as?: React.ElementType
  id?: string
}

export default function ScrollReveal({
  children,
  className,
  delay = 0,
  as: Component = 'div',
  id,
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      {
        threshold: 0.05,
        rootMargin: '-50px',
      }
    )

    const currentRef = ref.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <Component
      ref={ref}
      id={id}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)`,
        transitionDelay: delay ? `${delay}s` : undefined,
      }}
    >
      {children}
    </Component>
  )
}
