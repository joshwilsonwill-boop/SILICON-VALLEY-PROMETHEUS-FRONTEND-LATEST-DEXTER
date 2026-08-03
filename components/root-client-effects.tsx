'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { useActivityDetector } from '@/hooks/useActivityDetector'
import { usePasteDetector } from '@/hooks/usePasteDetector'
import { useUserPreferencesHydrator } from '@/hooks/use-user-preferences'
import { ThemeInjector } from '@/components/theme/theme-injector'

const AppToaster = dynamic(() => import('@/components/ui/app-toaster').then((mod) => mod.AppToaster), {
  ssr: false,
})

const CinematicClickRipple = dynamic(
  () => import('@/components/ui/cinematic-click-ripple').then((mod) => mod.CinematicClickRipple),
  {
    ssr: false,
  },
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

export function RootClientEffects() {
  const pathname = usePathname()
  const isAuthRoute = AUTH_ROUTE_REGEX.test(pathname)
  const supportsOnboarding = pathname.startsWith('/studio') || pathname.startsWith('/editor/')
  useActivityDetector()
  usePasteDetector()
  useUserPreferencesHydrator()

  return (
    <>
      <ThemeInjector />
      {isAuthRoute ? null : <CinematicClickRipple />}
      {isAuthRoute ? null : <GlobalHelpLauncher />}
      {supportsOnboarding ? <CinematicOnboarding pathname={pathname} /> : null}
      {pathname.startsWith('/editor/') ? <EditorialOnboardingReplay pathname={pathname} /> : null}
      <AppToaster />
    </>
  )
}
