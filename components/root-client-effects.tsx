'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { useActivityDetector } from '@/hooks/useActivityDetector'
import { usePasteDetector } from '@/hooks/usePasteDetector'
import { useUserPreferencesHydrator } from '@/hooks/use-user-preferences'
import { useDeferredEnhancementsReady } from '@/hooks/use-deferred-enhancements-ready'
import { ThemeInjector } from '@/components/theme/theme-injector'

const AppToaster = dynamic(() => import('@/components/ui/app-toaster').then((mod) => mod.AppToaster), {
  ssr: false,
})

// Keep the voice companion out of the initial shared client bundle. Its UI
// mounts after the browser has time for enhancements.
const JarvisTopNavFilament = dynamic(
  () => import('@/components/navigation/jarvis-top-nav-filament').then((mod) => mod.JarvisTopNavFilament),
  { ssr: false },
)

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

// Autonomous editor controls are only used inside the editor. Keep their
// coordinator and session UI out of every other route's client bundle.
const AgenticCursorLayer = dynamic(
  () => import('@/components/editor/autonomous/agentic-cursor-layer').then((mod) => mod.AgenticCursorLayer),
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

  return (
    <>
      <ThemeInjector />
      {enhancementsReady ? <JarvisTopNavFilament /> : null}
      {isEditorRoute ? <AgenticCursorLayer /> : null}
      {enhancementsReady && (
        <>
          {isEditorRoute ? null : <LuxuryMotionController />}
          {isEditorRoute ? null : <CustomCursor />}
          <UserPreferencesHydrator />
          {isAuthRoute ? null : <CinematicClickRipple />}
          {isAuthRoute ? null : <GlobalHelpLauncher />}
          {supportsOnboarding ? <CinematicOnboarding pathname={pathname} /> : null}
        </>
      )}
      <AppToaster />
    </>
  )
}
