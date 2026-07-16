'use client'

import * as React from 'react'
import { formatSourceStatus, type SourceMetadata, type SourceStatus } from './media-metadata'

let status: SourceStatus | undefined
let sourceUrl: string | null = null
const listeners = new Set<() => void>()

export function setEditorSourceStatus(metadata: SourceMetadata) {
  status = formatSourceStatus(metadata)
  listeners.forEach((listener) => listener())
}

export function setEditorSourceUrl(url: string | null) {
  sourceUrl = url
  listeners.forEach((listener) => listener())
}

export function useEditorSourceStatus() {
  return React.useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
    () => status,
    () => undefined,
  )
}

export function useEditorSourceUrl() {
  return React.useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
    () => sourceUrl,
    () => null,
  )
}
