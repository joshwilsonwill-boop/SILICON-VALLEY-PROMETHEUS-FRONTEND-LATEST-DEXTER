import { AuthShell } from '@/components/auth/AuthShell'
import { LoginForm } from '@/components/auth/LoginForm'
import { LoadingAnimation } from '@/components/loading-animation'
import { Suspense } from 'react'

export default function LoginPage() {
  return (
    <AuthShell title="Sign in" subtitle="Use OAuth or your email and password.">
      <Suspense fallback={<LoadingAnimation message="Loading sign in..." />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  )
}
