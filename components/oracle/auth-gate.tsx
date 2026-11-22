'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Lock, Mail, Key, LogIn, UserPlus, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface AuthGateProps {
  onAuthenticated: (token: string, userEmail: string) => void
  userToken: string | null
  userEmail: string | null
  onSignOut: () => void
}

export function AuthGate({
  onAuthenticated,
  userToken,
  userEmail,
  onSignOut,
}: AuthGateProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    try {
      const supabase = createClient()
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.access_token) {
          onAuthenticated(session.access_token, session.user.email || 'authenticated-user')
        }
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.access_token) {
          onAuthenticated(session.access_token, session.user.email || 'authenticated-user')
        } else {
          onSignOut()
        }
      })

      return () => {
        subscription.unsubscribe()
      }
    } catch (err: any) {
      console.warn('Supabase client initialization warning:', err)
    }
  }, [onAuthenticated, onSignOut])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      const supabase = createClient()
      if (isSignUp) {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
        })
        if (signUpErr) throw signUpErr
        if (data.session?.access_token) {
          onAuthenticated(data.session.access_token, data.user?.email || email)
          setMessage('Account created and signed in successfully!')
        } else {
          setMessage('Account created! Please check your email to confirm your account.')
        }
      } else {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInErr) throw signInErr
        if (data.session?.access_token) {
          onAuthenticated(data.session.access_token, data.user?.email || email)
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  if (userToken) {
    return (
      <div className="flex items-center justify-between p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-400 font-medium">
              Authenticated via Supabase
            </div>
            <div className="text-sm font-medium text-zinc-200">
              {userEmail || 'Active Session'}
            </div>
          </div>
        </div>
        <button
          onClick={async () => {
            try {
              const supabase = createClient()
              await supabase.auth.signOut()
            } catch {}
            onSignOut()
          }}
          className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/50 rounded-lg transition-colors"
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-md">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
          <Lock className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            {isSignUp ? 'Create Prometheus Account' : 'Sign in to Prometheus'}
          </h2>
          <p className="text-xs text-zinc-400">
            Bearer authentication required for Oracle video processing
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start space-x-2 text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start space-x-2 text-emerald-400 text-xs">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full pl-9 pr-3 py-2 bg-zinc-950/70 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Key className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-9 pr-3 py-2 bg-zinc-950/70 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-zinc-950 font-semibold rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isSignUp ? (
            <>
              <UserPlus className="w-4 h-4" />
              <span>Create Account</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-4 pt-4 border-t border-zinc-800/80 text-center">
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp)
            setError(null)
            setMessage(null)
          }}
          className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          {isSignUp
            ? 'Already have an account? Sign In'
            : "Don't have an account? Create one"}
        </button>
      </div>
    </div>
  )
}
