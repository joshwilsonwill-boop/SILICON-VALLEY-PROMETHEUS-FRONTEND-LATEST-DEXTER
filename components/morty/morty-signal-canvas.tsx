'use client'

import { useEffect, useRef } from 'react'

import type { MortyStatus } from '@/lib/morty/conversation'

const TAU = Math.PI * 2

function statusEnergy(status: MortyStatus) {
  if (status === 'listening') return 1.35
  if (status === 'thinking') return 0.92
  if (status === 'speaking') return 1.12
  if (status === 'error') return 0.3
  return 0.62
}

export function MortySignalCanvas({
  status,
  active,
}: {
  status: MortyStatus
  active: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let width = 0
    let height = 0
    let ratio = 1
    let observer: ResizeObserver | null = null

    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      width = Math.max(1, bounds.width)
      height = Math.max(1, bounds.height)
      ratio = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.floor(width * ratio)
      canvas.height = Math.floor(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }

    const draw = (time: number) => {
      if (!width || !height) resize()
      const energy = statusEnergy(status)
      const motionTime = reducedMotion ? 0 : time * 0.00042
      const centerX = width * 0.5
      const centerY = height * 0.48
      const radius = Math.min(width, height) * 0.23

      context.clearRect(0, 0, width, height)
      context.fillStyle = '#050607'
      context.fillRect(0, 0, width, height)

      context.save()
      context.translate(centerX, centerY)
      context.rotate(motionTime * (status === 'thinking' ? -0.45 : 0.24))
      context.strokeStyle = status === 'error' ? 'rgba(248,113,113,0.6)' : 'rgba(0,240,255,0.34)'
      context.lineWidth = 1

      for (let ring = 0; ring < 4; ring += 1) {
        const ringRadius = radius * (0.64 + ring * 0.2)
        context.beginPath()
        for (let point = 0; point <= 80; point += 1) {
          const angle = (point / 80) * TAU
          const pulse = Math.sin(angle * (3 + ring) + motionTime * (8 + ring * 2)) * (2.4 + energy * 3.6)
          const x = Math.cos(angle) * (ringRadius + pulse)
          const y = Math.sin(angle) * (ringRadius + pulse) * 0.62
          if (point === 0) context.moveTo(x, y)
          else context.lineTo(x, y)
        }
        context.stroke()
      }

      const nodeCount = active ? 52 : 34
      for (let node = 0; node < nodeCount; node += 1) {
        const angle = (node / nodeCount) * TAU + motionTime * (node % 2 ? 0.8 : -0.56)
        const orbit = radius * (0.78 + (node % 7) * 0.075)
        const wobble = Math.sin(motionTime * 10 + node * 1.7) * energy * 8
        const x = Math.cos(angle) * (orbit + wobble)
        const y = Math.sin(angle) * (orbit + wobble) * 0.62
        const alpha = 0.22 + ((node % 5) / 5) * 0.6
        context.fillStyle = status === 'error' ? `rgba(248,113,113,${alpha})` : `rgba(149,249,255,${alpha})`
        context.beginPath()
        context.arc(x, y, node % 6 === 0 ? 2.2 : 1.1, 0, TAU)
        context.fill()
      }
      context.restore()

      context.fillStyle = status === 'error' ? 'rgba(248,113,113,0.8)' : 'rgba(0,240,255,0.75)'
      context.fillRect(centerX - 1, centerY - 1, 2, 2)

      if (!reducedMotion && active) frame = window.requestAnimationFrame(draw)
    }

    resize()
    draw(0)
    if (!reducedMotion && active) frame = window.requestAnimationFrame(draw)

    observer = new ResizeObserver(resize)
    observer.observe(canvas)
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        window.cancelAnimationFrame(frame)
        return
      }
      if (!reducedMotion && active) frame = window.requestAnimationFrame(draw)
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.cancelAnimationFrame(frame)
      observer?.disconnect()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [active, status])

  return <canvas ref={canvasRef} className="absolute inset-0 size-full" aria-hidden="true" />
}
