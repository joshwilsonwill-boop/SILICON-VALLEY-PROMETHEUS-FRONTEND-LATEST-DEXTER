'use client'

import { LoadingAnimation } from '@/components/loading-animation'

interface EditorLoadingScreenProps {
  caption?: string
  className?: string
}

export function EditorLoadingScreen({
  caption = 'Loading...',
  className,
}: EditorLoadingScreenProps) {
  return (
    <LoadingAnimation
      message={`${caption} Preparing the editor workspace.`}
      className={className}
    />
  )
}
