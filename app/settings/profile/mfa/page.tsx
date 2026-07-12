'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Check, KeyRound, Phone, Smartphone } from 'lucide-react'
import { toast } from 'sonner'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { PrometheusShell } from '@/components/prometheus-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type MfaMethod = 'passkey' | 'authenticator' | 'sms'

type MfaOption = {
  id: MfaMethod
  title: string
  subtext: string
  icon: React.ComponentType<{ className?: string }>
}

const MFA_STORAGE_KEY = 'prometheus_mfa_primary'
const SAVE_DELAY_MS = 800

const MFA_OPTIONS: MfaOption[] = [
  {
    id: 'passkey',
    title: 'Passkey',
    subtext: 'Use your device biometric or security key',
    icon: KeyRound,
  },
  {
    id: 'authenticator',
    title: 'Authenticator App',
    subtext: 'Google Authenticator, Authy, or similar',
    icon: Smartphone,
  },
  {
    id: 'sms',
    title: 'SMS Verification',
    subtext: 'Receive codes via text message',
    icon: Phone,
  },
]

function delay(ms = SAVE_DELAY_MS) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function readPrimaryMethod(): MfaMethod | null {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(MFA_STORAGE_KEY)
  return value === 'passkey' || value === 'authenticator' || value === 'sms' ? value : null
}

function writePrimaryMethod(value: MfaMethod | null) {
  if (typeof window === 'undefined') return
  if (!value) {
    window.localStorage.removeItem(MFA_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(MFA_STORAGE_KEY, value)
}

export default function MfaSettingsPage() {
  const [primaryMethod, setPrimaryMethod] = React.useState<MfaMethod | null>(null)
  const [setupMethod, setSetupMethod] = React.useState<MfaMethod | null>(null)
  const [savingMethod, setSavingMethod] = React.useState<MfaMethod | null>(null)
  const [verificationCode, setVerificationCode] = React.useState('')
  const [phoneNumber, setPhoneNumber] = React.useState('')

  React.useEffect(() => {
    setPrimaryMethod(readPrimaryMethod())
  }, [])

  async function activateMethod(method: MfaMethod) {
    setSavingMethod(method)
    await delay()
    setPrimaryMethod(method)
    writePrimaryMethod(method)
    setSetupMethod(null)
    setSavingMethod(null)
    setVerificationCode('')
    setPhoneNumber('')
    toast.success('MFA method updated')
  }

  async function removeMethod(method: MfaMethod) {
    setSavingMethod(method)
    await delay()
    if (primaryMethod === method) {
      setPrimaryMethod(null)
      writePrimaryMethod(null)
    }
    setSavingMethod(null)
    toast.success('MFA method removed')
  }

  return (
    <PrometheusShell>
      <div className="min-h-full bg-[linear-gradient(180deg,rgba(19,20,26,0.9)_0%,rgba(9,10,13,0.94)_100%)] px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <header className="mb-8">
            <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 text-white/62">
              <Link href="/settings/profile">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight text-white">Multi-Factor Authentication</h1>
            <p className="mt-2 text-sm text-white/50">Choose one primary method for account verification.</p>
          </header>

          <div className="space-y-4">
            {MFA_OPTIONS.map((option) => (
              <MfaOptionCard
                key={option.id}
                option={option}
                active={primaryMethod === option.id}
                saving={savingMethod === option.id}
                setupOpen={setupMethod === option.id}
                verificationCode={verificationCode}
                phoneNumber={phoneNumber}
                onSetVerificationCode={setVerificationCode}
                onSetPhoneNumber={setPhoneNumber}
                onActivate={() => void activateMethod(option.id)}
                onOpenSetup={() => {
                  if (option.id === 'passkey') {
                    toast.info('Passkey setup flow coming soon')
                    void activateMethod(option.id)
                    return
                  }
                  setSetupMethod((current) => (current === option.id ? null : option.id))
                }}
                onRemove={() => void removeMethod(option.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </PrometheusShell>
  )
}

function MfaOptionCard({
  active,
  onActivate,
  onOpenSetup,
  onRemove,
  onSetPhoneNumber,
  onSetVerificationCode,
  option,
  phoneNumber,
  saving,
  setupOpen,
  verificationCode,
}: {
  active: boolean
  onActivate: () => void
  onOpenSetup: () => void
  onRemove: () => void
  onSetPhoneNumber: (value: string) => void
  onSetVerificationCode: (value: string) => void
  option: MfaOption
  phoneNumber: string
  saving: boolean
  setupOpen: boolean
  verificationCode: string
}) {
  const Icon = option.icon

  return (
    <motion.section
      whileHover={{ y: -4 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 shadow-[0_34px_90px_-58px_rgba(0,0,0,0.95)] backdrop-blur-xl"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/60">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-white">{option.title}</h2>
              {active ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#6366f1]/36 bg-[#6366f1]/14 px-2 py-0.5 text-[10px] font-medium text-[#c7d2fe]">
                  <Check className="size-3" />
                  Primary
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-white/50">{option.subtext}</p>
            <div className="mt-3 inline-flex items-center gap-2 text-xs text-white/42">
              <span className={cn('size-2 rounded-full', active ? 'bg-emerald-400' : 'bg-white/28')} />
              {active ? 'Active' : 'Not set up'}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          {active ? (
            <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={onRemove}>
              {saving ? <InlineLoadingAnimation size={16} label={`Removing ${option.title}`} /> : null}
              Remove
            </Button>
          ) : (
            <Button type="button" size="sm" variant="secondary" disabled={saving} title="Setup flow stub" onClick={onOpenSetup}>
              {saving ? <InlineLoadingAnimation size={16} label={`Setting up ${option.title}`} /> : null}
              Set up
            </Button>
          )}
        </div>
      </div>

      {setupOpen && option.id === 'authenticator' ? (
        <div className="mt-5 rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
          <div className="grid gap-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center">
            <div className="flex size-40 items-center justify-center rounded-[22px] border border-white/10 bg-black/30">
              <div className="grid grid-cols-5 gap-1">
                {Array.from({ length: 25 }).map((_, index) => (
                  <span key={index} className={cn('size-4 rounded-[4px]', index % 3 === 0 ? 'bg-white/80' : 'bg-white/12')} />
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-white/50" htmlFor="mfa-code">
                Verify code
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <Input
                  id="mfa-code"
                  value={verificationCode}
                  onChange={(event) => onSetVerificationCode(event.target.value)}
                  className="h-10 rounded-[14px] border-white/16 bg-white/[0.06] text-white/90"
                />
                <Button type="button" size="sm" disabled={saving || verificationCode.trim().length === 0} onClick={onActivate}>
                  {saving ? <InlineLoadingAnimation size={16} label="Verifying authentication code" /> : null}
                  Verify code
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {setupOpen && option.id === 'sms' ? (
        <div className="mt-5 rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
          <label className="text-sm text-white/50" htmlFor="mfa-phone">
            Phone number
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input
              id="mfa-phone"
              value={phoneNumber}
              onChange={(event) => onSetPhoneNumber(event.target.value)}
              className="h-10 rounded-[14px] border-white/16 bg-white/[0.06] text-white/90"
            />
            <Button type="button" size="sm" disabled={saving || phoneNumber.trim().length === 0} onClick={onActivate}>
              {saving ? <InlineLoadingAnimation size={16} label="Sending verification code" /> : null}
              Send code
            </Button>
          </div>
        </div>
      ) : null}
    </motion.section>
  )
}
