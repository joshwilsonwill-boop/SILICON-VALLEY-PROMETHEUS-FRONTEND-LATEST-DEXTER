import type { ReactNode } from 'react'

import { ReactQueryProvider } from '@/components/ReactQueryProvider'
import { EditorProvider } from '@/components/editor/EditorProvider'
import { EditorRouteShell } from '@/components/editor/EditorRouteShell'
import './styles/editor-layout.css'

export const metadata = {
  title: 'Prometheus Editor',
  description: 'AI-powered motion intelligence workspace',
}

export default function EditorLayout({ children }: { children: ReactNode }) {
  return (
    <ReactQueryProvider>
      <EditorProvider>
        <EditorRouteShell>{children}</EditorRouteShell>
      </EditorProvider>
    </ReactQueryProvider>
  )
}
