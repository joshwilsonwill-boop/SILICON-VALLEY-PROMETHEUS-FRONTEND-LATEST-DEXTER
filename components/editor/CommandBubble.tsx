'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X, Sparkles } from 'lucide-react'
import { InlineLoadingAnimation } from '@/components/loading-animation'
import { useEditor } from './EditorContext'

const SUGGESTIONS = [
  'Make typography more aggressive',
  'Add glitch effect transition',
  'Slow down this segment by 20%',
  'Enhance colors to neon cyberpunk',
  'Add particle burst at start',
]

export const CommandBubble: React.FC = () => {
  const { selection, showCommandBubble, addPrompt, clearSelection } = useEditor()
  const [prompt, setPrompt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (showCommandBubble && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [showCommandBubble])

  if (!showCommandBubble || !selection) return null

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const handleSubmit = async () => {
    if (!prompt.trim()) return
    setIsSubmitting(true)
    await new Promise((r) => setTimeout(r, 400))
    addPrompt('seg-active', prompt)
    setIsSubmitting(false)
    setPrompt('')
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          className="w-full max-w-lg mx-4 rounded-2xl bg-[#0c0c10]/90 backdrop-blur-[32px] border border-white/[0.08] shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-cyan-400" />
              <span className="text-sm font-semibold text-white/90">AI Motion Editor</span>
            </div>
            <button onClick={clearSelection} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors active:scale-95">
              <X size={16} className="text-white/40" />
            </button>
          </div>

          <div className="px-5 py-3 bg-white/[0.02] flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 text-[11px] font-mono">
              {formatTime(selection.startTime)}
            </span>
            <span className="text-[11px] text-white/30">to</span>
            <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 text-[11px] font-mono">
              {formatTime(selection.endTime)}
            </span>
            <span className="text-[11px] text-white/30 ml-auto">
              {Math.floor(selection.endTime - selection.startTime)}s
            </span>
          </div>

          <div className="p-5 space-y-4">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe how you want to modify this segment..."
              className="w-full h-24 bg-white/5 rounded-xl p-3 text-sm text-white placeholder:text-white/30 border border-white/[0.06] focus:border-cyan-500/40 focus:outline-none resize-none transition-colors"
            />
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(s)}
                  className="px-3 py-1.5 rounded-full bg-white/5 text-[11px] text-white/50 hover:bg-white/10 hover:text-white/80 transition-colors border border-white/[0.04]"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={clearSelection} className="px-4 py-2 rounded-lg text-sm text-white/60 hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!prompt.trim() || isSubmitting}
                className="px-4 py-2 rounded-lg bg-cyan-500 text-black text-sm font-medium hover:bg-cyan-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
              >
                {isSubmitting ? <><InlineLoadingAnimation size={14} label="Processing edit request" /> Processing...</> : <><Send size={14} /> DONE</>}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
