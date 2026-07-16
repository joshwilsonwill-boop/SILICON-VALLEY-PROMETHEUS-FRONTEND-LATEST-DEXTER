'use client'

import * as React from 'react'
import { formatSourceStatus, type SourceMetadata, type SourceStatus } from './media-metadata'

let status: SourceStatus | undefined
const listeners = new Set<() => void>()

export function setEditorSourceStatus(metadata: SourceMetadata) {
  status = formatSourceStatus(metadata)
  listeners.forEach((listener) => listener())
}

export function useEditorSourceStatus() {
  return React.useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
    () => status,
    () => undefined,
  )
}
