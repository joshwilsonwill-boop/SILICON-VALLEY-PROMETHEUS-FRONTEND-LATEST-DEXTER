'use client'

import { useEffect } from 'react'
import { useReducedMotion } from 'framer-motion'

const RESTING_POSITION = { x: 50, y: 38 }

/**
 * Shares a softly eased pointer position with the CSS motion system. Keeping
 * this outside individual screens lets the interface feel coherent on every route.
 */
export function LuxuryMotionController() {
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const root = document.documentElement
    let frame = 0
    let current = { ...RESTING_POSITION }
    let target = { ...RESTING_POSITION }

    const writePosition = () => {
      frame = 0
      current.x += (target.x - current.x) * 0.13
      current.y += (target.y - current.y) * 0.13

      root.style.setProperty('--luxury-pointer-x', `${current.x.toFixed(2)}%`)
      root.style.setProperty('--luxury-pointer-y', `${current.y.toFixed(2)}%`)

      if (Math.abs(target.x - current.x) > 0.02 || Math.abs(target.y - current.y) > 0.02) {
        frame = window.requestAnimationFrame(writePosition)
      }
    }

    const updateTarget = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return

      target = {
        x: Math.max(0, Math.min(100, (event.clientX / window.innerWidth) * 100)),
        y: Math.max(0, Math.min(100, (event.clientY / window.innerHeight) * 100)),
      }

      if (!frame) frame = window.requestAnimationFrame(writePosition)
    }

    const resetTarget = () => {
      target = { ...RESTING_POSITION }
      if (!frame) frame = window.requestAnimationFrame(writePosition)
    }

    if (reduceMotion) {
      root.dataset.prometheusLuxuryMotion = 'reduced'
      root.style.setProperty('--luxury-pointer-x', `${RESTING_POSITION.x}%`)
      root.style.setProperty('--luxury-pointer-y', `${RESTING_POSITION.y}%`)
      return () => {
        delete root.dataset.prometheusLuxuryMotion
      }
    }

    root.dataset.prometheusLuxuryMotion = 'active'
    root.style.setProperty('--luxury-pointer-x', `${RESTING_POSITION.x}%`)
    root.style.setProperty('--luxury-pointer-y', `${RESTING_POSITION.y}%`)
    window.addEventListener('pointermove', updateTarget, { passive: true })
    window.addEventListener('blur', resetTarget)
    document.addEventListener('mouseleave', resetTarget)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', updateTarget)
      window.removeEventListener('blur', resetTarget)
      document.removeEventListener('mouseleave', resetTarget)
      delete root.dataset.prometheusLuxuryMotion
    }
  }, [reduceMotion])

  return null
}
