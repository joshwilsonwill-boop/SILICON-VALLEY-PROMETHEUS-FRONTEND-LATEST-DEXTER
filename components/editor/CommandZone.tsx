'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Command, Download, Music, Scissors, Sparkles, Wand2 } from 'lucide-react'
import { autonomousCoordinator } from '@/lib/autonomous-ui/coordinator'

const quickActions = [
  { id: 'auto-cut', label: 'Jarvis Auto-Cut', icon: Scissors, command: 'auto-cut' },
  { id: 'auto-music', label: 'Jarvis Music', icon: Music, command: 'auto-music' },
  { id: 'interrogate', label: 'Interrogate', icon: Sparkles, command: 'ai' },
  { id: 'enhance', label: 'Enhance', icon: Wand2, command: 'enhance' },
  { id: 'export', label: 'Export', icon: Download, command: 'export' },
]

function dispatchEditorCommand(command: string) {
  if (command === 'auto-cut') {
    autonomousCoordinator.executeTranscriptCut('at the same part')
    return
  }
  if (command === 'auto-music') {
    autonomousCoordinator.executeMusicSelection({ genreOrMood: 'atmospheric' })
    return
  }
  window.dispatchEvent(new CustomEvent('prometheus:editor-command', { detail: { command } }))
}

export function CommandZone() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const openZone = () => setOpen(true)
    const closeZone = () => setOpen(false)
    const toggleZone = () => setOpen((nextOpen) => !nextOpen)

    window.addEventListener('prometheus:command-zone-open', openZone)
    window.addEventListener('prometheus:command-zone-close', closeZone)
    window.addEventListener('prometheus:command-zone-toggle', toggleZone)

    return () => {
      window.removeEventListener('prometheus:command-zone-open', openZone)
      window.removeEventListener('prometheus:command-zone-close', closeZone)
      window.removeEventListener('prometheus:command-zone-toggle', toggleZone)
    }
  }, [])

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            aria-label="Close command zone"
            className="command-zone-backdrop fixed inset-0 z-40 cursor-default"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] left-1/2 z-50 -translate-x-1/2">
        <AnimatePresence>
          {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 10, scale: 0.96, filter: 'blur(6px)' }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="command-zone-dock glass-panel mb-4 flex max-w-[calc(100vw-2rem)] gap-1.5 overflow-x-auto rounded-[18px] border border-border-subtle p-1.5"
          >
            {quickActions.map((action) => {
              const Icon = action.icon

              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => dispatchEditorCommand(action.command)}
                  aria-label={action.label}
                  className="premium-liquid-pill command-zone-action flex h-11 items-center gap-2 rounded-[12px] border border-white/8 bg-white/[0.035] px-4 text-[13px] font-medium text-text-secondary transition-all hover:bg-white/[0.07] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
                >
                  <Icon className="h-4 w-4" />
                  <span>{action.label}</span>
                </button>
              )
            })}
          </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setOpen((nextOpen) => !nextOpen)}
          className="premium-icon-orbit flex h-12 w-12 items-center justify-center rounded-full border border-accent-cyan/30 bg-accent-cyan-glow text-accent-cyan shadow-glow-cyan transition-all hover:scale-105 hover:shadow-glow-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
          aria-expanded={open}
          aria-label={open ? 'Close command zone' : 'Open command zone'}
        >
          <Command className="h-5 w-5" />
        </button>
      </div>
    </>
  )
}
