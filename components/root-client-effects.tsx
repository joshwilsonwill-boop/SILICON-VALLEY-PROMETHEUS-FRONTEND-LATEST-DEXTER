'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { useActivityDetector } from '@/hooks/useActivityDetector'
import { usePasteDetector } from '@/hooks/usePasteDetector'
import { useUserPreferencesHydrator } from '@/hooks/use-user-preferences'
import { useDeferredEnhancementsReady } from '@/hooks/use-deferred-enhancements-ready'
import { ThemeInjector } from '@/components/theme/theme-injector'
import { autonomousCoordinator } from '@/lib/autonomous-ui/coordinator'

const AppToaster = dynamic(() => import('@/components/ui/app-toaster').then((mod) => mod.AppToaster), {
  ssr: false,
})

const CinematicClickRipple = dynamic(
  () => import('@/components/ui/cinematic-click-ripple').then((mod) => mod.CinematicClickRipple),
  {
    ssr: false,
  },
)

const CustomCursor = dynamic(
  () => import('@/components/ui/custom-cursor').then((mod) => mod.CustomCursor),
  { ssr: false },
)

const LuxuryMotionController = dynamic(
  () => import('@/components/luxury-motion-controller').then((mod) => mod.LuxuryMotionController),
  { ssr: false },
)

// Keep rarely used overlays out of the initial route bundle. Their code is
// fetched only on the studio/editor surfaces where onboarding can run, or
// after the help launcher has mounted.
const GlobalHelpLauncher = dynamic(() => import('@/components/global-help-launcher').then((mod) => mod.GlobalHelpLauncher), {
  ssr: false,
})

const CinematicOnboarding = dynamic(
  () => import('@/components/onboarding/cinematic-onboarding').then((mod) => mod.CinematicOnboarding),
  { ssr: false },
)

const EditorialOnboardingReplay = dynamic(
  () => import('@/components/onboarding/cinematic-onboarding').then((mod) => mod.EditorialOnboardingReplay),
  { ssr: false },
)

const AUTH_ROUTE_REGEX = /^\/(?:login|signup|verify|forgot-password|reset-password|terms|privacy|refund|cookie-policy)(?:\/|$)/

function UserPreferencesHydrator() {
  useUserPreferencesHydrator()
  return null
}

export function RootClientEffects() {
  const pathname = usePathname()
  const isAuthRoute = AUTH_ROUTE_REGEX.test(pathname)
  const supportsOnboarding = pathname.startsWith('/studio') || pathname.startsWith('/editor/')
  // The editor chamber runs its own heavy rAF/pointer workloads; skip the
  // global cursor + luxury-motion rAF loops there to keep the page responsive.
  const isEditorRoute = pathname.startsWith('/editor/')
  const enhancementsReady = useDeferredEnhancementsReady()
  useActivityDetector()
  usePasteDetector()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as unknown as { autonomousCoordinator?: typeof autonomousCoordinator }).autonomousCoordinator =
        autonomousCoordinator
    }
  }, [])

  return (
    <>
      <ThemeInjector />
      {enhancementsReady && (
        <>
          {isEditorRoute ? null : <LuxuryMotionController />}
          {isEditorRoute ? null : <CustomCursor />}
          <UserPreferencesHydrator />
          {isAuthRoute ? null : <CinematicClickRipple />}
          {isAuthRoute ? null : <GlobalHelpLauncher />}
          {supportsOnboarding ? <CinematicOnboarding pathname={pathname} /> : null}
          {pathname.startsWith('/editor/') ? <EditorialOnboardingReplay pathname={pathname} /> : null}
        </>
      )}
      <AppToaster />
    </>
  )
}
