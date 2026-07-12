import { AuthShell } from '@/components/auth/AuthShell'
import { SignupForm } from '@/components/auth/SignupForm'
import { LoadingAnimation } from '@/components/loading-animation'
import { Suspense } from 'react'

export default function SignupPage() {
  return (
    <AuthShell
      title="Create account"
      subtitle="Create a new account in under a minute."
      compact
      showLegalCopy={false}
      showSocialAuth={false}
    >
      <Suspense fallback={<LoadingAnimation message="Loading account setup..." />}>
        <SignupForm compact />
      </Suspense>
    </AuthShell>
  )
}
