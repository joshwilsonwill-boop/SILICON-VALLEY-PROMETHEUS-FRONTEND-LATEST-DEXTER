'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

import { Footer } from '@/components/Footer'
import { LandingHeader } from '@/components/LandingHeader'
import { useAuth } from '@/components/auth/auth-provider'
import { WorkspaceFrame } from '@/components/workspace-frame'
import { shouldShowGlobalFooter } from '@/lib/footer-routes'

export function RootLayoutFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { session } = useAuth()
  const isPublic = shouldShowGlobalFooter(pathname) && !(pathname === '/' && session)

  return (
    <div className="prometheus-motion-root flex min-h-screen flex-col">
      {isPublic ? <LandingHeader /> : null}
      <div className="flex-1">
        {isPublic ? children : <WorkspaceFrame>{children}</WorkspaceFrame>}
      </div>
      {isPublic ? <Footer /> : null}
    </div>
  )
}
