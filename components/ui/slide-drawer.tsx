'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'

export interface SlideDrawerProps {
  isOpen: boolean
  onClose: () => void
  direction: 'left' | 'right'
  width: string
  children: React.ReactNode
  backdropBlur?: boolean
  className?: string
  ariaLabel?: string
}

function getFocusableElements(root: HTMLElement) {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true')
}

export function SlideDrawer({
  isOpen,
  onClose,
  direction,
  width,
  children,
  backdropBlur = true,
  className,
  ariaLabel = 'Slide drawer',
}: SlideDrawerProps) {
  const drawerRef = React.useRef<HTMLDivElement | null>(null)
  const lastActiveElementRef = React.useRef<HTMLElement | null>(null)
  useBodyScrollLock(isOpen)

  React.useEffect(() => {
    if (!isOpen) return

    lastActiveElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    window.requestAnimationFrame(() => {
      const drawer = drawerRef.current
      if (!drawer) return
      const focusable = getFocusableElements(drawer)
      focusable[0]?.focus()
    })

    return () => {
      lastActiveElementRef.current?.focus()
    }
  }, [isOpen])

  React.useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const drawer = drawerRef.current
      if (!drawer) return

      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      const focusable = getFocusableElements(drawer)
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const closedTransform = direction === 'right' ? 'translate-x-full' : '-translate-x-full'
  const side = direction === 'right' ? 'right-0' : 'left-0'

  return (
    <>
      <button
        type="button"
        tabIndex={isOpen ? 0 : -1}
        aria-label="Close drawer backdrop"
        aria-hidden={!isOpen}
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-[80] outline-none transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none',
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.38)',
          backdropFilter: backdropBlur ? 'blur(12px) brightness(0.7)' : 'brightness(0.7)',
          WebkitBackdropFilter: backdropBlur ? 'blur(12px) brightness(0.7)' : 'brightness(0.7)',
        }}
      />

      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-hidden={!isOpen}
        className={cn(
          'fixed inset-y-0 z-[90] flex max-w-[calc(100vw-24px)] flex-col overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.48)] transition-[transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform motion-reduce:transition-none',
          side,
          isOpen ? 'translate-x-0' : closedTransform,
          className
        )}
        style={{
          width,
          backgroundColor: 'var(--light-ui-surface, rgba(10, 10, 15, 0.88))',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderLeft: direction === 'right' ? '1px solid var(--light-ui-border, rgba(255, 255, 255, 0.08))' : undefined,
          borderRight: direction === 'left' ? '1px solid var(--light-ui-border, rgba(255, 255, 255, 0.08))' : undefined,
        }}
      >
        {children}
      </div>
    </>
  )
}
