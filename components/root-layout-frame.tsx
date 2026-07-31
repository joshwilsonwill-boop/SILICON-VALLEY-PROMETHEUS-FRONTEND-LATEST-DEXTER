'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

import { Footer } from '@/components/Footer'
import { WorkspaceFrame } from '@/components/workspace-frame'
import { shouldShowGlobalFooter } from '@/lib/footer-routes'

export function RootLayoutFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="prometheus-motion-root flex min-h-screen flex-col">
      <div className="flex-1">
        <WorkspaceFrame>{children}</WorkspaceFrame>
      </div>
      {shouldShowGlobalFooter(pathname) ? <Footer /> : null}
    </div>
  )
}
