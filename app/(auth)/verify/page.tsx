import { AuthShell } from '@/components/auth/AuthShell'
import { VerifyForm } from '@/components/auth/VerifyForm'
import { LoadingAnimation } from '@/components/loading-animation'
import { Suspense } from 'react'

export default function VerifyPage() {
  return (
    <AuthShell title="Verify your email" subtitle="Enter the 6-digit code we sent you to unlock the workspace.">
      <Suspense fallback={<LoadingAnimation message="Loading verification..." />}>
        <VerifyForm />
      </Suspense>
    </AuthShell>
  )
}
