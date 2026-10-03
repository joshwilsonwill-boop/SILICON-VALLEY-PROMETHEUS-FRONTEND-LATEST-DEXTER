'use client';

import Link from 'next/link';
import React, { Suspense } from 'react';
import { BrandWordmark } from '@/components/brand-wordmark';
import { InlineLoadingAnimation } from '@/components/loading-animation';
import { FloatingPaths, AuthSeparator } from './auth-visuals';
import { SocialAuthButtons } from './SocialAuthButtons';
import { PrometheusAuthCharacters } from './animated-auth-characters';
import { AuthInteractionProvider } from './auth-interaction';

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  compact?: boolean;
  showMobileBrandRow?: boolean;
  showLegalCopy?: boolean;
  showSocialAuth?: boolean;
};

export function AuthShell({
  title,
  subtitle,
  children,
  compact = false,
  showMobileBrandRow = true,
  showLegalCopy = true,
  showSocialAuth = true,
}: AuthShellProps) {
  return (
    <AuthInteractionProvider>
      <main className="relative min-h-[calc(100dvh-5rem)] overflow-hidden bg-[#050505] text-white lg:grid lg:grid-cols-[minmax(0,1.03fr)_minmax(420px,0.97fr)]">
        <div
          className={[
            "relative hidden h-full min-h-[calc(100dvh-5rem)] flex-col overflow-hidden border-r border-white/8 bg-[radial-gradient(circle_at_22%_8%,rgba(56,189,248,0.16),transparent_36%),linear-gradient(135deg,rgba(13,13,16,1)_0%,rgba(5,5,5,1)_100%)] lg:flex",
            compact ? 'auth-shell-art-compact p-6' : 'p-10',
          ].join(' ')}
        >
          <div className="pointer-events-none absolute inset-0 opacity-45">
            <FloatingPaths position={1} />
            <FloatingPaths position={-1} />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_58%,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_28%,transparent_58%),linear-gradient(180deg,transparent_0%,rgba(5,5,5,0.66)_100%)]" />

          <BrandWordmark className="relative z-10" />

          <div className={compact ? 'relative z-10 flex min-h-0 flex-1 items-center justify-center py-4' : 'relative z-10 flex min-h-0 flex-1 items-center justify-center py-8'}>
            <PrometheusAuthCharacters />
          </div>

          <div className={compact ? 'relative z-10 flex items-center gap-5 text-[11px] text-white/38' : 'relative z-10 flex items-center gap-7 text-xs text-white/38'}>
            <Link href="/privacy" className="transition-colors hover:text-white/72">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-white/72">
              Terms of Service
            </Link>
            <Link href="/contact" className="transition-colors hover:text-white/72">
              Contact
            </Link>
          </div>
        </div>

        <div
          className={[
            'pointer-events-auto relative z-[100] flex min-h-[calc(100dvh-5rem)] flex-col justify-center bg-[#050505] px-5 md:px-8',
            compact ? 'auth-shell-panel-compact py-4' : 'py-8',
          ].join(' ')}
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-70">
            <div className="absolute right-0 top-0 h-[46rem] w-[18rem] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.055)_0%,rgba(255,255,255,0.015)_62%,transparent_100%)] blur-sm" />
            <div className="absolute bottom-[-20%] left-[18%] h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.12)_0%,transparent_66%)]" />
          </div>



          <div className={compact ? 'auth-shell-stack-compact pointer-events-auto z-[110] mx-auto w-full max-w-[390px] space-y-3' : 'pointer-events-auto z-[110] mx-auto w-full max-w-[390px] space-y-4'}>
            {showMobileBrandRow ? (
              <div className="lg:hidden"><BrandWordmark /></div>
            ) : null}

            <div className={compact ? 'flex flex-col space-y-0.5 text-center sm:text-left' : 'flex flex-col space-y-1 text-center sm:text-left'}>
              <h1 className="[font-family:var(--font-playfair-display)] text-2xl font-semibold tracking-tight text-white">{title}</h1>
              <p className={compact ? 'text-sm leading-5 text-white/46' : 'text-sm leading-6 text-white/46'}>{subtitle}</p>
            </div>

            {showSocialAuth ? (
              <>
                <Suspense
                  fallback={
                    <InlineLoadingAnimation
                      size={120}
                      label="Loading sign-in options"
                      className="mx-auto"
                    />
                  }
                >
                  <SocialAuthButtons />
                </Suspense>

                <AuthSeparator />
              </>
            ) : null}

            <Suspense
              fallback={
                <InlineLoadingAnimation
                  size={120}
                  label="Loading authentication form"
                  className="mx-auto"
                />
              }
            >
              {children}
            </Suspense>

            {showLegalCopy ? (
            <p className={compact ? 'mt-3 text-xs leading-5 text-white/38' : 'mt-8 text-sm leading-6 text-white/38'}>
              By clicking continue, you agree to our{' '}
              <Link href="/terms" className="underline underline-offset-4 transition-colors hover:text-white/72">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="underline underline-offset-4 transition-colors hover:text-white/72">
                Privacy Policy
              </Link>
              .
            </p>
            ) : null}
          </div>
        </div>
      </main>
    </AuthInteractionProvider>
  );
}
