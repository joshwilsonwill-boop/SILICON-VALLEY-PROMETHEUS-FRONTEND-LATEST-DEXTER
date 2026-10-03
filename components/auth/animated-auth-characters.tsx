'use client'

import * as React from 'react'
import { useReducedMotion } from 'framer-motion'

import { useAuthInteraction } from './auth-interaction'

type FacePosition = {
  bodySkew: number
  faceX: number
  faceY: number
}

type EyeBallProps = {
  eyeColor?: string
  forceLookX?: number
  forceLookY?: number
  isBlinking?: boolean
  maxDistance?: number
  pointer: { x: number; y: number }
  pupilColor?: string
  pupilSize?: number
  reduceMotion: boolean
  size?: number
}

type PupilProps = {
  forceLookX?: number
  forceLookY?: number
  maxDistance?: number
  pointer: { x: number; y: number }
  pupilColor?: string
  reduceMotion: boolean
  size?: number
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function useRandomBlink(enabled: boolean) {
  const [isBlinking, setIsBlinking] = React.useState(false)

  React.useEffect(() => {
    if (!enabled) {
      setIsBlinking(false)
      return
    }

    let blinkTimer: number | null = null
    let releaseTimer: number | null = null
    let cancelled = false

    const scheduleBlink = () => {
      blinkTimer = window.setTimeout(() => {
        if (cancelled) return
        setIsBlinking(true)
        releaseTimer = window.setTimeout(() => {
          setIsBlinking(false)
          if (!cancelled) scheduleBlink()
        }, 140)
      }, 2600 + Math.random() * 4200)
    }

    scheduleBlink()

    return () => {
      cancelled = true
      if (blinkTimer !== null) window.clearTimeout(blinkTimer)
      if (releaseTimer !== null) window.clearTimeout(releaseTimer)
    }
  }, [enabled])

  return isBlinking
}

function usePointerPosition(enabled: boolean) {
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  const frameRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (!enabled) return

    const handleMouseMove = (event: MouseEvent) => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
      frameRef.current = window.requestAnimationFrame(() => {
        setPosition({ x: event.clientX, y: event.clientY })
        frameRef.current = null
      })
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
    }
  }, [enabled])

  return position
}

function getPupilPosition(
  ref: React.RefObject<HTMLDivElement | null>,
  pointer: { x: number; y: number },
  maxDistance: number,
  forceLookX?: number,
  forceLookY?: number,
) {
  if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY }
  if (!ref.current) return { x: 0, y: 0 }

  const rect = ref.current.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const deltaX = pointer.x - centerX
  const deltaY = pointer.y - centerY
  const distance = Math.min(Math.hypot(deltaX, deltaY), maxDistance)
  const angle = Math.atan2(deltaY, deltaX)

  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
  }
}

function usePupilPosition(ref: React.RefObject<HTMLDivElement | null>, pointer: { x: number; y: number }, maxDistance: number, reduceMotion: boolean, forceLookX?: number, forceLookY?: number) {
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  React.useEffect(() => {
    setPosition(reduceMotion ? { x: 0, y: 0 } : getPupilPosition(ref, pointer, maxDistance, forceLookX, forceLookY))
  }, [ref, pointer, maxDistance, reduceMotion, forceLookX, forceLookY])
  return position
}

function EyeBall({
  eyeColor = 'white',
  forceLookX,
  forceLookY,
  isBlinking = false,
  maxDistance = 5,
  pointer,
  pupilColor = '#242428',
  pupilSize = 7,
  reduceMotion,
  size = 18,
}: EyeBallProps) {
  const eyeRef = React.useRef<HTMLDivElement | null>(null)
  const pupilPosition = usePupilPosition(eyeRef, pointer, maxDistance, reduceMotion, forceLookX, forceLookY)

  return (
    <div
      ref={eyeRef}
      className="flex items-center justify-center rounded-full transition-all duration-150"
      style={{
        backgroundColor: eyeColor,
        height: isBlinking ? 2 : size,
        overflow: 'hidden',
        width: size,
      }}
    >
      {!isBlinking ? (
        <span
          className="rounded-full"
          style={{
            backgroundColor: pupilColor,
            height: pupilSize,
            transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
            transition: reduceMotion ? 'none' : 'transform 110ms ease-out',
            width: pupilSize,
          }}
        />
      ) : null}
    </div>
  )
}

function Pupil({
  forceLookX,
  forceLookY,
  maxDistance = 5,
  pointer,
  pupilColor = '#242428',
  reduceMotion,
  size = 12,
}: PupilProps) {
  const pupilRef = React.useRef<HTMLDivElement | null>(null)
  const pupilPosition = usePupilPosition(pupilRef, pointer, maxDistance, reduceMotion, forceLookX, forceLookY)

  return (
    <span
      ref={pupilRef}
      className="rounded-full"
      style={{
        backgroundColor: pupilColor,
        height: size,
        transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
        transition: reduceMotion ? 'none' : 'transform 110ms ease-out',
        width: size,
      }}
    />
  )
}

export function PrometheusAuthCharacters() {
  const reduceMotion = useReducedMotion()
  const motionReduced = Boolean(reduceMotion)
  const { activeField, isSubmitting, passwordLength, showPassword } = useAuthInteraction()
  const pointer = usePointerPosition(!motionReduced)
  const purpleRef = React.useRef<HTMLDivElement | null>(null)
  const blackRef = React.useRef<HTMLDivElement | null>(null)
  const orangeRef = React.useRef<HTMLDivElement | null>(null)
  const yellowRef = React.useRef<HTMLDivElement | null>(null)
  const [isLookingAtEachOther, setIsLookingAtEachOther] = React.useState(false)
  const [isPurplePeeking, setIsPurplePeeking] = React.useState(false)
  const purpleBlinking = useRandomBlink(!motionReduced)
  const blackBlinking = useRandomBlink(!motionReduced)
  const activePasswordField = activeField === 'password' || activeField === 'confirm'
  const typingSignal = activeField !== 'idle' || passwordLength > 0
  const hiddenPasswordSignal = passwordLength > 0 && !showPassword
  const visiblePasswordSignal = passwordLength > 0 && showPassword

  React.useEffect(() => {
    if (motionReduced || activeField === 'idle') {
      setIsLookingAtEachOther(false)
      return
    }

    setIsLookingAtEachOther(true)
    const timer = window.setTimeout(() => setIsLookingAtEachOther(false), 860)
    return () => window.clearTimeout(timer)
  }, [activeField, motionReduced])

  React.useEffect(() => {
    if (motionReduced || !visiblePasswordSignal) {
      setIsPurplePeeking(false)
      return
    }

    let cancelled = false
    let peekTimer: number | null = null
    let releaseTimer: number | null = null

    const schedulePeek = () => {
      peekTimer = window.setTimeout(() => {
        if (cancelled) return
        setIsPurplePeeking(true)
        releaseTimer = window.setTimeout(() => {
          setIsPurplePeeking(false)
          if (!cancelled) schedulePeek()
        }, 760)
      }, 1400 + Math.random() * 2400)
    }

    schedulePeek()

    return () => {
      cancelled = true
      if (peekTimer !== null) window.clearTimeout(peekTimer)
      if (releaseTimer !== null) window.clearTimeout(releaseTimer)
    }
  }, [motionReduced, visiblePasswordSignal])

  const calculatePosition = React.useCallback(
    (ref: React.RefObject<HTMLDivElement | null>): FacePosition => {
      if (motionReduced || !ref.current) return { bodySkew: 0, faceX: 0, faceY: 0 }

      const rect = ref.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 3
      const deltaX = pointer.x - centerX
      const deltaY = pointer.y - centerY

      return {
        bodySkew: clamp(-deltaX / 120, -6, 6),
        faceX: clamp(deltaX / 20, -15, 15),
        faceY: clamp(deltaY / 30, -10, 10),
      }
    },
    [pointer.x, pointer.y, motionReduced],
  )

  const [positions, setPositions] = React.useState<FacePosition[]>(Array.from({ length: 4 }, () => ({ bodySkew: 0, faceX: 0, faceY: 0 })))
  React.useEffect(() => {
    setPositions([calculatePosition(purpleRef), calculatePosition(blackRef), calculatePosition(orangeRef), calculatePosition(yellowRef)])
  }, [calculatePosition])
  const [purplePos, blackPos, orangePos, yellowPos] = positions
  const purpleTransform = visiblePasswordSignal
    ? 'skewX(0deg) translateX(0px)'
    : hiddenPasswordSignal || typingSignal
      ? `skewX(${purplePos.bodySkew - 10}deg) translateX(34px)`
      : `skewX(${purplePos.bodySkew}deg)`
  const blackTransform = visiblePasswordSignal
    ? 'skewX(0deg) translateX(0px)'
    : isLookingAtEachOther
      ? `skewX(${blackPos.bodySkew * 1.4 + 8}deg) translateX(18px)`
      : `skewX(${blackPos.bodySkew * 1.2}deg)`

  return (
    <div className="auth-character-stage relative h-[min(58vh,520px)] min-h-[360px] w-full max-w-[640px] overflow-visible" aria-hidden="true">
      <div className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-white/16 to-transparent" />
      <div
        ref={purpleRef}
        className="absolute bottom-0 rounded-t-[14px] bg-[#7048ff] shadow-[0_28px_70px_-38px_rgba(112,72,255,0.78)] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          height: hiddenPasswordSignal || activePasswordField ? 444 : 400,
          left: '16%',
          transform: purpleTransform,
          transformOrigin: 'bottom center',
          width: 182,
          zIndex: 1,
        }}
      >
        <div
          className="absolute flex gap-8 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            left: visiblePasswordSignal ? 28 : isLookingAtEachOther ? 58 : 48 + purplePos.faceX,
            top: visiblePasswordSignal ? 38 : isLookingAtEachOther ? 66 : 44 + purplePos.faceY,
          }}
        >
          <EyeBall
            forceLookX={visiblePasswordSignal ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
            forceLookY={visiblePasswordSignal ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
            isBlinking={purpleBlinking}
            pointer={pointer}
            reduceMotion={motionReduced}
          />
          <EyeBall
            forceLookX={visiblePasswordSignal ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
            forceLookY={visiblePasswordSignal ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
            isBlinking={purpleBlinking}
            pointer={pointer}
            reduceMotion={motionReduced}
          />
        </div>
      </div>

      <div
        ref={blackRef}
        className="absolute bottom-0 rounded-t-[12px] bg-[#28282c] shadow-[0_24px_58px_-38px_rgba(0,0,0,0.95)] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          height: 312,
          left: '45%',
          transform: blackTransform,
          transformOrigin: 'bottom center',
          width: 126,
          zIndex: 2,
        }}
      >
        <div
          className="absolute flex gap-6 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            left: visiblePasswordSignal ? 13 : isLookingAtEachOther ? 34 : 28 + blackPos.faceX,
            top: visiblePasswordSignal ? 30 : isLookingAtEachOther ? 14 : 34 + blackPos.faceY,
          }}
        >
          <EyeBall
            forceLookX={visiblePasswordSignal ? -4 : isLookingAtEachOther ? 0 : undefined}
            forceLookY={visiblePasswordSignal ? -4 : isLookingAtEachOther ? -4 : undefined}
            isBlinking={blackBlinking}
            maxDistance={4}
            pointer={pointer}
            pupilSize={6}
            reduceMotion={motionReduced}
            size={16}
          />
          <EyeBall
            forceLookX={visiblePasswordSignal ? -4 : isLookingAtEachOther ? 0 : undefined}
            forceLookY={visiblePasswordSignal ? -4 : isLookingAtEachOther ? -4 : undefined}
            isBlinking={blackBlinking}
            maxDistance={4}
            pointer={pointer}
            pupilSize={6}
            reduceMotion={motionReduced}
            size={16}
          />
        </div>
      </div>

      <div
        ref={orangeRef}
        className="absolute bottom-0 rounded-t-full bg-[#ff996c] shadow-[0_26px_64px_-42px_rgba(255,153,108,0.78)] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          height: 202,
          left: '5%',
          transform: visiblePasswordSignal ? 'skewX(0deg)' : `skewX(${orangePos.bodySkew}deg)`,
          transformOrigin: 'bottom center',
          width: 244,
          zIndex: 3,
        }}
      >
        <div
          className="absolute flex gap-8 transition-all duration-200 ease-out"
          style={{
            left: visiblePasswordSignal ? 50 : 84 + orangePos.faceX,
            top: visiblePasswordSignal ? 86 : 92 + orangePos.faceY,
          }}
        >
          <Pupil forceLookX={visiblePasswordSignal ? -5 : undefined} forceLookY={visiblePasswordSignal ? -4 : undefined} pointer={pointer} reduceMotion={motionReduced} />
          <Pupil forceLookX={visiblePasswordSignal ? -5 : undefined} forceLookY={visiblePasswordSignal ? -4 : undefined} pointer={pointer} reduceMotion={motionReduced} />
        </div>
      </div>

      <div
        ref={yellowRef}
        className="absolute bottom-0 rounded-t-full bg-[#eadf58] shadow-[0_22px_54px_-38px_rgba(234,223,88,0.65)] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          height: isSubmitting ? 242 : 232,
          left: '59%',
          transform: visiblePasswordSignal ? 'skewX(0deg)' : `skewX(${yellowPos.bodySkew}deg)`,
          transformOrigin: 'bottom center',
          width: 144,
          zIndex: 4,
        }}
      >
        <div
          className="absolute flex gap-6 transition-all duration-200 ease-out"
          style={{
            left: visiblePasswordSignal ? 22 : 54 + yellowPos.faceX,
            top: visiblePasswordSignal ? 36 : 42 + yellowPos.faceY,
          }}
        >
          <Pupil forceLookX={visiblePasswordSignal ? -5 : undefined} forceLookY={visiblePasswordSignal ? -4 : undefined} pointer={pointer} reduceMotion={motionReduced} />
          <Pupil forceLookX={visiblePasswordSignal ? -5 : undefined} forceLookY={visiblePasswordSignal ? -4 : undefined} pointer={pointer} reduceMotion={motionReduced} />
        </div>
        <div
          className="absolute h-[3px] w-20 rounded-full bg-[#242428] transition-all duration-200 ease-out"
          style={{
            left: visiblePasswordSignal ? 14 : 42 + yellowPos.faceX,
            top: visiblePasswordSignal ? 90 : 90 + yellowPos.faceY,
          }}
        />
      </div>
    </div>
  )
}
