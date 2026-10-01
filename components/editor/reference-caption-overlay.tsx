'use client'

import type { EditorCaptionStyle } from '@/lib/editor-actions'
import type { MotionTranscriptSegment } from './motion-edit-workspace'
import { cn } from '@/lib/utils'

export function ReferenceCaptionOverlay({ segment, timeSec, style }: { segment?: MotionTranscriptSegment; timeSec: number; style: EditorCaptionStyle }) {
  if (!segment || segment.isCut) return null
  const words = segment.words?.filter(word => !word.isCut)
  const text = words?.length ? words.map(word => word.text).join(' ') : segment.words?.length ? '' : segment.text
  if (!text.trim()) return null
  const revealed = words?.length ? words.filter(word => word.start <= timeSec).map(word => word.text).join(' ') : text
  return (
    <div data-motion-caption-overlay className={cn('pointer-events-none absolute inset-x-[8%] bottom-[16%] z-10 flex justify-center text-center', style === 'lower_third' && 'bottom-[18%] justify-start text-left')}>
      <p className={cn('max-w-full whitespace-pre-wrap rounded-md bg-black/75 px-3 py-2 text-[clamp(12px,2.4cqw,26px)] font-semibold leading-snug text-white shadow-lg', style === 'lower_third' && 'border-l-2 border-[#b4fb60]', style === 'typewriter' && 'font-mono')}>
        {style === 'karaoke_pop' && words?.length ? words.map((word, index) => <span key={index} className={cn(timeSec >= word.start && timeSec < word.end && 'text-[#b4fb60]')}>{word.text}{index < words.length - 1 ? ' ' : ''}</span>) : style === 'typewriter' ? revealed : text}
      </p>
    </div>
  )
}
