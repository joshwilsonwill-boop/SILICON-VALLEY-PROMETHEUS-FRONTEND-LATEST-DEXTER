import { AuthShell } from '@/components/auth/AuthShell'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'
import { LoadingAnimation } from '@/components/loading-animation'
import { Suspense } from 'react'

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset password" subtitle="We will email you a secure recovery link.">
      <Suspense fallback={<LoadingAnimation message="Loading password recovery..." />}>
        <ForgotPasswordForm />
      </Suspense>
    </AuthShell>
  )
}
