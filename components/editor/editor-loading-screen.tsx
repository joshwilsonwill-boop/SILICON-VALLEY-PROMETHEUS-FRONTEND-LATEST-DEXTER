'use client'

import { LoadingAnimation } from '@/components/loading-animation'

interface EditorLoadingScreenProps {
  caption?: string
  className?: string
}

export function EditorLoadingScreen({ className }: EditorLoadingScreenProps) {
  return (
    <LoadingAnimation
      className={className}
    />
  )
}
