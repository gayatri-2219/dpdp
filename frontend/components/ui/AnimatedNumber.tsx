'use client'
/**
 * AnimatedNumber — CountUp animation for metric cards.
 * Counts from 0 to the target value over ~0.8s.
 */
import { useEffect, useRef, useState } from 'react'

interface CountUpProps {
  end: number
  duration?: number
  decimals?: number
}

export function CountUp({ end, duration = 800, decimals = 0 }: CountUpProps) {
  const [value, setValue] = useState(0)
  const startTime = useRef<number | null>(null)
  const rafId = useRef<number>(0)
  const endRef = useRef(end)
  endRef.current = end

  useEffect(() => {
    if (end === 0) { setValue(0); return }

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const elapsed = timestamp - startTime.current
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(parseFloat((eased * endRef.current).toFixed(decimals)))
      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate)
      } else {
        setValue(endRef.current)
      }
    }

    startTime.current = null
    rafId.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId.current)
  }, [end, duration, decimals])

  return <>{decimals > 0 ? value.toFixed(decimals) : Math.floor(value).toLocaleString()}</>
}
