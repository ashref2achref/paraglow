'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'

interface Sparkle {
  id: string
  x: string
  y: string
  color: string
  size: number
  delay: number
}

const DEFAULT_COLORS = {
  first: '#d6b456', // Gold
  second: '#153f2b', // Forest Green
}

function seededRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

export default function Sparkles({
  colors = DEFAULT_COLORS,
  count = 10,
}: {
  colors?: { first: string; second: string }
  count?: number
}) {
  const [isIntersecting, setIsIntersecting] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const sparkles = useMemo<Sparkle[]>(() => (
    Array.from({ length: count }, (_, index) => {
      const seed = index + count * 31
      const x = seededRandom(seed + 1)
      const y = seededRandom(seed + 2)
      const colorChoice = seededRandom(seed + 3)
      const size = seededRandom(seed + 4)
      const delay = seededRandom(seed + 5)

      return {
        id: `sparkle-${index}`,
        x: `${x * 100}%`,
        y: `${y * 100}%`,
        color: colorChoice > 0.4 ? colors.first : colors.second,
        size: Math.floor(size * 12) + 10,
        delay: delay * 2,
      }
    })
  ), [colors.first, colors.second, count])

  // Intersection Observer to pause animation when out of viewport
  useEffect(() => {
    const currentRef = containerRef.current
    if (!currentRef) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
      },
      { threshold: 0 }
    )

    observer.observe(currentRef)
    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 pointer-events-none z-10 overflow-visible"
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes sparkle-pulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(0) rotate(0deg);
            opacity: 0;
          }
          50% {
            transform: translate(-50%, -50%) scale(1) rotate(90deg);
            opacity: 1;
          }
        }
        .sparkle-element {
          animation: sparkle-pulse 2s ease-in-out infinite;
        }
        .sparkle-paused {
          animation-play-state: paused !important;
        }
      `}} />

      {sparkles.map((sparkle) => (
        <svg
          key={sparkle.id}
          className={`absolute sparkle-element ${!isIntersecting ? 'sparkle-paused' : ''}`}
          style={{
            left: sparkle.x,
            top: sparkle.y,
            width: sparkle.size,
            height: sparkle.size,
            animationDelay: `${sparkle.delay}s`,
            position: 'absolute',
            transform: 'translate(-50%, -50%)',
          }}
          viewBox="0 0 160 160"
          fill="none"
        >
          <path
            d="M80 0C80 0 80 80 0 80C80 80 80 80 80 160C80 160 80 80 160 80C80 80 80 80 80 0Z"
            fill={sparkle.color}
          />
        </svg>
      ))}
    </div>
  )
}
