'use client'

import { cn } from '@/lib/utils'

import { InfinityLoader } from '@/components/editor/InfinityLoader'

interface EditorLoadingScreenProps {
  caption?: string
  className?: string
}

export function EditorLoadingScreen({
  caption = 'Loading...',
  className,
}: EditorLoadingScreenProps) {
  return (
    <InfinityLoader
      visible
      mode="infinity"
      title={caption}
      subtitle="Preparing the editor workspace."
      className={cn(className)}
    />
  )
}
