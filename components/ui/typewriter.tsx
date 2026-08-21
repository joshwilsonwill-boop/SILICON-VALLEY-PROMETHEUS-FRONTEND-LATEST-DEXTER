"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface TypewriterProps {
  words: string[]
  typingSpeed?: number
  deletingSpeed?: number
  pauseDuration?: number
  className?: string
  cursorClassName?: string
  showGhostText?: boolean
  ghostClassName?: string
}

export function Typewriter({
  words,
  typingSpeed = 90,
  deletingSpeed = 45,
  pauseDuration = 1800,
  className,
  cursorClassName,
  showGhostText = true,
  ghostClassName,
}: TypewriterProps) {
  const [wordIndex, setWordIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  const currentWord = words[wordIndex] || ""
  const previousWord = words[(wordIndex - 1 + words.length) % words.length] || ""

  useEffect(() => {
    let timer: NodeJS.Timeout

    if (!isDeleting && charIndex < currentWord.length) {
      // Typing phase
      timer = setTimeout(() => {
        setCharIndex((prev) => prev + 1)
      }, typingSpeed)
    } else if (!isDeleting && charIndex === currentWord.length) {
      // Pause at full word
      timer = setTimeout(() => {
        setIsDeleting(true)
      }, pauseDuration)
    } else if (isDeleting && charIndex > 0) {
      // Deleting phase
      timer = setTimeout(() => {
        setCharIndex((prev) => prev - 1)
      }, deletingSpeed)
    } else if (isDeleting && charIndex === 0) {
      // Switch to next word
      setIsDeleting(false)
      setWordIndex((prev) => (prev + 1) % words.length)
    }

    return () => clearTimeout(timer)
  }, [charIndex, isDeleting, wordIndex, currentWord, words, typingSpeed, deletingSpeed, pauseDuration])

  const visibleText = currentWord.substring(0, charIndex)

  return (
    <div className={cn("relative inline-flex items-center font-sans tracking-tight", className)}>
      {/* Ghost Background Trail */}
      {showGhostText && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute left-0 top-0 select-none text-black/10 dark:text-white/10 transition-opacity duration-300",
            ghostClassName
          )}
        >
          {isDeleting ? currentWord : previousWord}
        </span>
      )}

      {/* Active Typed Text */}
      <span className="relative z-10 text-neutral-900 dark:text-neutral-100">
        {visibleText}
      </span>

      {/* Blinking Pipe Cursor */}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: [1, 0, 1] }}
        transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
        className={cn("relative z-10 ml-0.5 inline-block font-normal text-neutral-900 dark:text-neutral-100", cursorClassName)}
      >
        |
      </motion.span>
    </div>
  )
}
