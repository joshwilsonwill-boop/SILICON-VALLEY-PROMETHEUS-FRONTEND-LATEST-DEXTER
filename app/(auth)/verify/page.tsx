import { AuthShell } from '@/components/auth/AuthShell'
import { VerifyForm } from '@/components/auth/VerifyForm'
import { LoadingAnimation } from '@/components/loading-animation'
import { Suspense } from 'react'

export default function VerifyPage() {
  return (
    <AuthShell title="Check your email" subtitle="Confirm your address to unlock the workspace.">
      <Suspense fallback={<LoadingAnimation message="Loading verification..." />}>
        <VerifyForm />
      </Suspense>
    </AuthShell>
  )
}
