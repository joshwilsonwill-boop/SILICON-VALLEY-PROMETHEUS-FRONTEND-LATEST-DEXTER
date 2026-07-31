export const COMPLETION_EVENT_NAME = 'prometheus:editor:process-complete'

export type CompletionProcess = 'export' | 'source-upload' | 'video-animation'

export type CompletionEventDetail = {
  process: CompletionProcess
  title: string
  message: string
}

const completionCopy: Record<CompletionProcess, Omit<CompletionEventDetail, 'process'>> = {
  export: {
    title: 'Export complete',
    message: 'Your finished cut is ready to share.',
  },
  'source-upload': {
    title: 'Source received',
    message: 'Your footage is ready in the editor.',
  },
  'video-animation': {
    title: 'Animation complete',
    message: 'Your finished motion is ready to review.',
  },
}

export function createCompletionEventDetail(
  detail: Pick<CompletionEventDetail, 'process'> & Partial<Omit<CompletionEventDetail, 'process'>>,
): CompletionEventDetail {
  return {
    process: detail.process,
    ...completionCopy[detail.process],
    ...(detail.title ? { title: detail.title } : {}),
    ...(detail.message ? { message: detail.message } : {}),
  }
}

export function dispatchCompletionEvent(
  detail: Pick<CompletionEventDetail, 'process'> & Partial<Omit<CompletionEventDetail, 'process'>>,
) {
  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new CustomEvent<CompletionEventDetail>(COMPLETION_EVENT_NAME, {
      detail: createCompletionEventDetail(detail),
    }),
  )
}
