'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  Check,
  Copy,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  Laptop,
  Lock,
  Monitor,
  Moon,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Upload,
} from 'lucide-react'
import { useForm, useWatch, type FieldPath, type FieldPathValue } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { useAuth } from '@/components/auth/auth-provider'
import { InlineLoadingAnimation } from '@/components/loading-animation'
import { AvatarCropModal } from '@/components/settings/avatar-crop-modal'
import { PrometheusShell } from '@/components/prometheus-shell'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { LiquidChromeButton } from '@/components/ui/liquid-chrome-button'
import { Textarea } from '@/components/ui/textarea'
import { useAvatarUpload } from '@/hooks/use-avatar-upload'
import { useProfile } from '@/hooks/use-profile'
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  normalizeNotificationPreferences,
  type NotificationPreferences,
  useNotificationPreferenceStore,
} from '@/lib/notifications/preference-store'
import { syncNotificationPreferences, syncProfilePreferences } from '@/lib/profile/preferences-client'
import { useThemePreferenceStore } from '@/lib/theme/theme-store'
import { FONT_PRESETS, THEME_PRESETS } from '@/lib/theme/theme-tokens'
import { AvatarUploadError, validateAvatarFile } from '@/lib/upload/avatar-upload'
import { cn } from '@/lib/utils'

const SAVE_DELAY_MS = 800

const THEME_IDS = ['obsidian', 'midnight', 'ember', 'forest', 'aurora', 'glacier', 'rose-gold', 'solar'] as const
const FONT_IDS = ['inter', 'sf-pro-display', 'geist', 'jetbrains-mono', 'playfair-display', 'space-grotesk'] as const

const themeSchema = z.enum(THEME_IDS)
const fontSchema = z.enum(FONT_IDS)
const accentSchema = z.enum(['indigo', 'violet', 'cyan', 'emerald', 'amber', 'rose'])
const densitySchema = z.enum(['compact', 'comfortable', 'spacious'])
const sidebarSchema = z.enum(['left', 'right', 'collapsed'])
const exportQualitySchema = z.enum(['draft', 'standard', 'maximum'])
const exportFormatSchema = z.enum(['mp4', 'mov', 'prores'])
const pronounPresetSchema = z.enum(['she/her', 'he/him', 'they/them', 'any/all', 'custom'])

const notificationPreferencesSchema = z.object({
  email: z.object({
    marketing: z.boolean(),
    security: z.boolean(),
    updates: z.boolean(),
  }),
  push: z.object({
    browser: z.boolean(),
  }),
  inApp: z.object({
    realtime: z.boolean(),
  }),
})

const profileSettingsSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, 'Use at least 2 characters')
    .max(32, 'Keep username under 32 characters')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Use letters, numbers, dots, dashes, or underscores'),
  displayName: z
    .string()
    .trim()
    .min(2, 'Use at least 2 characters')
    .max(50, 'Keep display name under 50 characters')
    .regex(/^[A-Za-z]+(?:[A-Za-z -]*[A-Za-z])?$/, 'Use letters, spaces, or hyphens only'),
  avatarUrl: z.string().optional(),
  bio: z.string().trim().max(500, 'Keep bio under 500 characters'),
  pronouns: z.string().trim().max(64),
  pronounPreset: pronounPresetSchema,
  location: z.string().trim().max(100, 'Keep location under 100 characters'),
  theme: themeSchema,
  fontPreference: fontSchema,
  accent: accentSchema,
  density: densitySchema,
  sidebar: sidebarSchema,
  notificationPreferences: notificationPreferencesSchema,
  defaultExportQuality: exportQualitySchema,
  defaultFormat: exportFormatSchema,
  twoFactorEnabled: z.boolean(),
  apiKey: z.string().min(10),
  usageAnalytics: z.boolean(),
})

type ProfileSettingsFormValues = z.infer<typeof profileSettingsSchema>
type ThemeValue = z.infer<typeof themeSchema>
type FontValue = z.infer<typeof fontSchema>
type AccentValue = z.infer<typeof accentSchema>
type DensityValue = z.infer<typeof densitySchema>
type SidebarValue = z.infer<typeof sidebarSchema>
type ExportQualityValue = z.infer<typeof exportQualitySchema>
type ExportFormatValue = z.infer<typeof exportFormatSchema>
type SaveTarget = 'username' | 'displayName' | 'bio' | 'pronouns' | 'location' | 'avatar' | 'resetPassword' | 'apiKey' | 'session' | null
type PreferenceTarget =
  | 'theme'
  | 'font'
  | 'accent'
  | 'density'
  | 'sidebar'
  | 'notifications'
  | 'export'
  | 'analytics'
  | null

const DEFAULT_VALUES: ProfileSettingsFormValues = {
  username: 'creator',
  displayName: 'Creative Operator',
  avatarUrl: '',
  bio: '',
  pronouns: '',
  pronounPreset: 'they/them',
  location: '',
  theme: 'obsidian',
  fontPreference: 'inter',
  accent: 'indigo',
  density: 'comfortable',
  sidebar: 'left',
  notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
  defaultExportQuality: 'standard',
  defaultFormat: 'mp4',
  twoFactorEnabled: false,
  apiKey: 'pk_live_demo_cinema_access_key',
  usageAnalytics: false,
}

const THEME_OPTIONS: Array<{
  value: ThemeValue
  label: string
  description: string
  background: string
  foreground: string
  accent: string
}> = [
  ...THEME_PRESETS.map((preset) => ({
    value: preset.id,
    label: preset.name,
    description: `${preset.background} · ${preset.accent}`,
    background: preset.background,
    foreground: preset.foreground,
    accent: preset.accent,
  })),
]

const FONT_OPTIONS: Array<{ value: FontValue; label: string; stack: string }> = FONT_PRESETS.map((preset) => ({
  value: preset.id,
  label: preset.name,
  stack: preset.stack,
}))

const PRONOUN_OPTIONS: Array<{ value: z.infer<typeof pronounPresetSchema>; label: string }> = [
  { value: 'she/her', label: 'She / her' },
  { value: 'he/him', label: 'He / him' },
  { value: 'they/them', label: 'They / them' },
  { value: 'any/all', label: 'Any / all' },
  { value: 'custom', label: 'Custom' },
]

const ACCENT_OPTIONS: Array<{
  value: AccentValue
  label: string
  className: string
  hex: string
}> = [
  { value: 'indigo', label: 'Indigo', className: 'bg-[#6366f1]', hex: '#6366f1' },
  { value: 'violet', label: 'Violet', className: 'bg-violet-500', hex: '#8b5cf6' },
  { value: 'cyan', label: 'Cyan', className: 'bg-cyan-400', hex: '#22d3ee' },
  { value: 'emerald', label: 'Emerald', className: 'bg-emerald-400', hex: '#34d399' },
  { value: 'amber', label: 'Amber', className: 'bg-amber-400', hex: '#fbbf24' },
  { value: 'rose', label: 'Rose', className: 'bg-rose-400', hex: '#fb7185' },
]

const DENSITY_OPTIONS: Array<{ value: DensityValue; label: string }> = [
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'spacious', label: 'Spacious' },
]

const SIDEBAR_OPTIONS: Array<{ value: SidebarValue; label: string }> = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'collapsed', label: 'Collapsed' },
]

const EXPORT_QUALITY_OPTIONS: Array<{ value: ExportQualityValue; label: string }> = [
  { value: 'draft', label: 'Draft (fast)' },
  { value: 'standard', label: 'Standard' },
  { value: 'maximum', label: 'Maximum (slow)' },
]

const EXPORT_FORMAT_OPTIONS: Array<{ value: ExportFormatValue; label: string }> = [
  { value: 'mp4', label: 'MP4' },
  { value: 'mov', label: 'MOV' },
  { value: 'prores', label: 'ProRes' },
]

const MOCK_SESSIONS = [
  {
    id: 'current',
    icon: Monitor,
    device: 'Chrome on macOS',
    location: 'San Francisco, CA',
    updatedAt: 'Current session',
    current: true,
  },
  {
    id: 'ios',
    icon: Smartphone,
    device: 'Safari on iPhone',
    location: 'Los Angeles, CA',
    updatedAt: '2 hours ago',
    current: false,
  },
  {
    id: 'laptop',
    icon: Laptop,
    device: 'Edge on Windows',
    location: 'New York, NY',
    updatedAt: 'Yesterday',
    current: false,
  },
]

function delay(ms = SAVE_DELAY_MS) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function getEmailUsername(email: string | undefined | null) {
  return email?.split('@')[0]?.trim() || 'creator'
}

function getInitial(email: string | undefined | null, username: string) {
  return (getEmailUsername(email) || username || 'P').charAt(0).toUpperCase()
}

function safeRead(key: string) {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(key)
}

function safeWrite(key: string, value: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, value)
}

function readJson<T>(key: string, fallback: T): T {
  const raw = safeRead(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function readBoolean(key: string, fallback: boolean) {
  const raw = safeRead(key)
  if (raw === 'true') return true
  if (raw === 'false') return false
  return fallback
}

function inferPronounPreset(pronouns: string | undefined | null): ProfileSettingsFormValues['pronounPreset'] {
  if (!pronouns) return DEFAULT_VALUES.pronounPreset
  const normalized = pronouns.toLowerCase()
  if (normalized === 'she/her') return 'she/her'
  if (normalized === 'he/him') return 'he/him'
  if (normalized === 'they/them') return 'they/them'
  if (normalized === 'any/all') return 'any/all'
  return 'custom'
}

function loadSettings(
  email: string | undefined | null,
  profile?: {
    avatar_url?: string | null
    bio?: string | null
    display_name?: string | null
    font_preference?: string | null
    location?: string | null
    notification_preferences?: Record<string, unknown> | null
    pronouns?: string | null
    theme_preference?: string | null
  } | null,
): ProfileSettingsFormValues {
  const emailUsername = getEmailUsername(email)
  const notifications = normalizeNotificationPreferences(
    (profile?.notification_preferences as Partial<NotificationPreferences> | null) ??
      readJson('prometheus_profile_notifications', DEFAULT_VALUES.notificationPreferences),
  )
  const exportDefaults = readJson('prometheus_default_export_settings', {
    defaultExportQuality: DEFAULT_VALUES.defaultExportQuality,
    defaultFormat: DEFAULT_VALUES.defaultFormat,
  })
  const resolvedPronouns = profile?.pronouns ?? safeRead('prometheus_profile_pronouns') ?? DEFAULT_VALUES.pronouns

  const candidate = {
    ...DEFAULT_VALUES,
    username: safeRead('prometheus_username') || emailUsername,
    displayName: profile?.display_name ?? safeRead('prometheus_display_name') ?? emailUsername,
    avatarUrl: profile?.avatar_url ?? safeRead('prometheus_avatar_url') ?? DEFAULT_VALUES.avatarUrl,
    bio: profile?.bio ?? safeRead('prometheus_profile_bio') ?? DEFAULT_VALUES.bio,
    pronouns: resolvedPronouns,
    pronounPreset: inferPronounPreset(resolvedPronouns),
    location: profile?.location ?? safeRead('prometheus_profile_location') ?? DEFAULT_VALUES.location,
    theme: (profile?.theme_preference as ThemeValue | null) ?? (safeRead('prometheus_theme') as ThemeValue | null) ?? DEFAULT_VALUES.theme,
    fontPreference:
      (profile?.font_preference as FontValue | null) ??
      (safeRead('prometheus_font_preference') as FontValue | null) ??
      DEFAULT_VALUES.fontPreference,
    accent: safeRead('prometheus_accent') || DEFAULT_VALUES.accent,
    density: safeRead('prometheus_density') || DEFAULT_VALUES.density,
    sidebar: safeRead('prometheus_sidebar_position') || DEFAULT_VALUES.sidebar,
    notificationPreferences: notifications,
    defaultExportQuality: exportDefaults.defaultExportQuality || DEFAULT_VALUES.defaultExportQuality,
    defaultFormat: exportDefaults.defaultFormat || DEFAULT_VALUES.defaultFormat,
    twoFactorEnabled: readBoolean('prometheus_two_factor_enabled', DEFAULT_VALUES.twoFactorEnabled),
    apiKey: safeRead('prometheus_api_key') || DEFAULT_VALUES.apiKey,
    usageAnalytics: readBoolean('prometheus_usage_analytics', DEFAULT_VALUES.usageAnalytics),
  }

  const parsed = profileSettingsSchema.safeParse(candidate)
  return parsed.success ? parsed.data : { ...DEFAULT_VALUES, username: emailUsername, displayName: emailUsername }
}

function persistSettings(values: ProfileSettingsFormValues) {
  safeWrite('prometheus_username', values.username)
  safeWrite('prometheus_display_name', values.displayName)
  safeWrite('prometheus_avatar_url', values.avatarUrl || '')
  safeWrite('prometheus_profile_bio', values.bio)
  safeWrite('prometheus_profile_pronouns', values.pronouns)
  safeWrite('prometheus_profile_location', values.location)
  safeWrite('prometheus_theme', values.theme)
  safeWrite('prometheus_font_preference', values.fontPreference)
  safeWrite('prometheus_accent', values.accent)
  safeWrite('prometheus_density', values.density)
  safeWrite('prometheus_sidebar_position', values.sidebar)
  safeWrite('prometheus_profile_notifications', JSON.stringify(values.notificationPreferences))
  safeWrite(
    'prometheus_default_export_settings',
    JSON.stringify({
      defaultExportQuality: values.defaultExportQuality,
      defaultFormat: values.defaultFormat,
    }),
  )
  safeWrite('prometheus_two_factor_enabled', String(values.twoFactorEnabled))
  safeWrite('prometheus_api_key', values.apiKey)
  safeWrite('prometheus_usage_analytics', String(values.usageAnalytics))
}

function applyUiPreferences(theme: ThemeValue, accent: AccentValue, density: DensityValue) {
  if (typeof document === 'undefined') return
  const accentOption = ACCENT_OPTIONS.find((option) => option.value === accent) ?? ACCENT_OPTIONS[0]
  document.documentElement.dataset.accent = accent
  document.documentElement.style.setProperty('--accent', accentOption.hex)
  document.body.dataset.density = density
}

function getMaskedApiKey(apiKey: string, revealed: boolean) {
  if (revealed) return apiKey
  return 'pk_live_••••••••••••••••'
}

export default function ProfileSettingsPage() {
  const router = useRouter()
  const { session, isLoading: authLoading } = useAuth()
  const { profile } = useProfile()
  const { upload: uploadAvatarToR2, isUploading: isAvatarUploading, progress: avatarUploadProgress, reset: resetAvatarUploadError } = useAvatarUpload()
  const setThemeAndFont = useThemePreferenceStore((state) => state.setThemeAndFont)
  const setNotificationPreferences = useNotificationPreferenceStore((state) => state.setPreferences)
  const email = session?.user?.email ?? ''
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const previousAvatarUrlRef = React.useRef('')

  const form = useForm<ProfileSettingsFormValues>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: DEFAULT_VALUES,
    mode: 'onChange',
  })

  const {
    control,
    formState: { errors },
    getValues,
    register,
    reset,
    setValue,
    trigger,
  } = form

  const watchedValues = useWatch({ control })
  const username = watchedValues.username ?? DEFAULT_VALUES.username
  const selectedTheme = watchedValues.theme ?? DEFAULT_VALUES.theme
  const selectedFont = watchedValues.fontPreference ?? DEFAULT_VALUES.fontPreference
  const selectedAccent = watchedValues.accent ?? DEFAULT_VALUES.accent
  const selectedDensity = watchedValues.density ?? DEFAULT_VALUES.density
  const selectedSidebar = watchedValues.sidebar ?? DEFAULT_VALUES.sidebar
  const bio = watchedValues.bio ?? DEFAULT_VALUES.bio
  const pronouns = watchedValues.pronouns ?? DEFAULT_VALUES.pronouns
  const pronounPreset = watchedValues.pronounPreset ?? DEFAULT_VALUES.pronounPreset
  const location = watchedValues.location ?? DEFAULT_VALUES.location
  const notificationPreferences = normalizeNotificationPreferences(watchedValues.notificationPreferences)
  const defaultExportQuality = watchedValues.defaultExportQuality ?? DEFAULT_VALUES.defaultExportQuality
  const defaultFormat = watchedValues.defaultFormat ?? DEFAULT_VALUES.defaultFormat
  const apiKey = watchedValues.apiKey ?? DEFAULT_VALUES.apiKey
  const usageAnalytics = watchedValues.usageAnalytics ?? DEFAULT_VALUES.usageAnalytics

  const [settingsReady, setSettingsReady] = React.useState(false)
  const [avatarPreview, setAvatarPreview] = React.useState('')
  const [avatarCropSource, setAvatarCropSource] = React.useState<string | null>(null)
  const [isAvatarCropOpen, setIsAvatarCropOpen] = React.useState(false)
  const [savingTarget, setSavingTarget] = React.useState<SaveTarget>(null)
  const [savedTarget, setSavedTarget] = React.useState<SaveTarget>(null)
  const [savingPreference, setSavingPreference] = React.useState<PreferenceTarget>(null)
  const [apiRevealed, setApiRevealed] = React.useState(false)
  const [sessions, setSessions] = React.useState(MOCK_SESSIONS)
  const [dangerRevealed, setDangerRevealed] = React.useState(false)
  const [dangerChecked, setDangerChecked] = React.useState(false)
  const [deactivateOpen, setDeactivateOpen] = React.useState(false)

  React.useEffect(() => {
    const nextSettings = loadSettings(email, profile)
    reset(nextSettings)
    applyUiPreferences(nextSettings.theme, nextSettings.accent, nextSettings.density)
    setThemeAndFont({ themeId: nextSettings.theme, fontId: nextSettings.fontPreference })
    setNotificationPreferences(nextSettings.notificationPreferences)
    setSettingsReady(true)
  }, [email, profile, reset, setNotificationPreferences, setThemeAndFont])

  React.useEffect(() => {
    if (!settingsReady) return
    applyUiPreferences(selectedTheme, selectedAccent, selectedDensity)
    setThemeAndFont({ themeId: selectedTheme, fontId: selectedFont })
    setNotificationPreferences(notificationPreferences)
  }, [notificationPreferences, selectedAccent, selectedDensity, selectedFont, selectedTheme, setNotificationPreferences, setThemeAndFont, settingsReady])

  React.useEffect(() => {
    if (!avatarPreview.startsWith('blob:')) return
    return () => URL.revokeObjectURL(avatarPreview)
  }, [avatarPreview])

  React.useEffect(() => {
    if (!avatarCropSource?.startsWith('blob:')) return
    return () => URL.revokeObjectURL(avatarCropSource)
  }, [avatarCropSource])

  async function markPreferenceSaved(target: PreferenceTarget) {
    setSavingPreference(target)
    await delay()
    setSavingPreference(null)
  }

  function persistCurrentSettings() {
    const parsed = profileSettingsSchema.safeParse(getValues())
    if (parsed.success) persistSettings(parsed.data)
  }

  async function saveProfilePreferencesForCurrentValues(target: SaveTarget | PreferenceTarget) {
    const parsed = profileSettingsSchema.safeParse(getValues())
    if (!parsed.success) return false

    persistSettings(parsed.data)

    if (!session?.user) return true

    if (target === 'notifications') {
      await syncNotificationPreferences(parsed.data.notificationPreferences)
      setNotificationPreferences(parsed.data.notificationPreferences)
      return true
    }

    await syncProfilePreferences({
      displayName: parsed.data.displayName,
      bio: parsed.data.bio || undefined,
      pronouns: parsed.data.pronouns || undefined,
      location: parsed.data.location || undefined,
      themePreference: parsed.data.theme,
      fontPreference: parsed.data.fontPreference,
      avatarUrl:
        parsed.data.avatarUrl && !parsed.data.avatarUrl.startsWith('blob:')
          ? parsed.data.avatarUrl
          : undefined,
    })

    return true
  }

  async function saveTextField(target: 'username' | 'displayName' | 'bio' | 'pronouns' | 'location') {
    const isValid = await trigger(target)
    if (!isValid) return

    setSavingTarget(target)
    try {
      await delay()
      if (target === 'username') {
        persistCurrentSettings()
      } else {
        await saveProfilePreferencesForCurrentValues(target)
      }
      setSavedTarget(target)
      toast.success(
        target === 'displayName'
          ? 'Display name saved'
          : target === 'bio'
            ? 'Bio saved'
            : target === 'pronouns'
              ? 'Pronouns saved'
              : target === 'location'
                ? 'Location saved'
                : 'Username saved',
      )
      window.setTimeout(() => setSavedTarget(null), 1400)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save field.')
    } finally {
      setSavingTarget(null)
    }
  }

  function clearSelectedAvatarSource() {
    setAvatarCropSource((current) => {
      if (current?.startsWith('blob:')) {
        URL.revokeObjectURL(current)
      }
      return null
    })
    setIsAvatarCropOpen(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function updatePreference<T extends FieldPath<ProfileSettingsFormValues>>(
    target: PreferenceTarget,
    field: T,
    value: FieldPathValue<ProfileSettingsFormValues, T>,
  ) {
    setValue(field, value, { shouldDirty: true, shouldValidate: true })
    window.setTimeout(() => {
      persistCurrentSettings()
      if (target === 'theme' || target === 'font') {
        void saveProfilePreferencesForCurrentValues(target).catch((error) => {
          toast.error(error instanceof Error ? error.message : 'Unable to save preferences.')
        })
      }
    }, 0)

    if (target === 'theme') {
      setThemeAndFont({
        themeId: field === 'theme' ? (value as ThemeValue) : selectedTheme,
        fontId: field === 'fontPreference' ? (value as FontValue) : selectedFont,
      })
    }

    if (target === 'font') {
      setThemeAndFont({
        themeId: field === 'theme' ? (value as ThemeValue) : selectedTheme,
        fontId: field === 'fontPreference' ? (value as FontValue) : selectedFont,
      })
    }

    void markPreferenceSaved(target)
  }

  function updateNestedPreference(
    target: PreferenceTarget,
    field:
      | 'notificationPreferences.email.marketing'
      | 'notificationPreferences.email.security'
      | 'notificationPreferences.email.updates'
      | 'notificationPreferences.push.browser'
      | 'notificationPreferences.inApp.realtime',
    value: boolean,
  ) {
    setValue(field, value, { shouldDirty: true, shouldValidate: true })
    window.setTimeout(() => {
      persistCurrentSettings()
      void saveProfilePreferencesForCurrentValues('notifications').catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Unable to save notification preferences.')
      })
    }, 0)
    void markPreferenceSaved(target)
  }

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      validateAvatarFile(file)
      resetAvatarUploadError()

      const previewUrl = URL.createObjectURL(file)
      setAvatarCropSource(previewUrl)
      setIsAvatarCropOpen(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to use that image.')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  async function handleAvatarCropComplete(croppedImageBlob: Blob) {
    const previousAvatarUrl = watchedValues.avatarUrl || ''
    previousAvatarUrlRef.current = previousAvatarUrl

    const optimisticPreviewUrl = URL.createObjectURL(croppedImageBlob)
    const croppedFile = new File([croppedImageBlob], 'avatar.webp', {
      type: 'image/webp',
    })

    setSavingTarget('avatar')
    setAvatarPreview(optimisticPreviewUrl)
    setValue('avatarUrl', optimisticPreviewUrl, { shouldDirty: true, shouldValidate: true })

    try {
      const { publicUrl } = await uploadAvatarToR2(croppedFile)
      setValue('avatarUrl', publicUrl, { shouldDirty: true, shouldValidate: true })
      setAvatarPreview(publicUrl)
      clearSelectedAvatarSource()

      try {
        await saveProfilePreferencesForCurrentValues('avatar')
        toast.success('Avatar updated')
      } catch (error) {
        toast.error(
          error instanceof Error
            ? `Avatar saved to storage but profile not updated. ${error.message}`
            : 'Avatar saved to storage but profile not updated.',
        )
      }
    } catch (error) {
      setValue('avatarUrl', previousAvatarUrl, { shouldDirty: true, shouldValidate: true })
      setAvatarPreview(previousAvatarUrl)

      if (error instanceof AvatarUploadError && error.code === 'SESSION_EXPIRED') {
        toast.error(error.message)
        clearSelectedAvatarSource()
        router.push('/login')
      } else {
        toast.error(error instanceof Error ? error.message : 'Upload failed. Check your connection.')
      }

      throw error
    } finally {
      setSavingTarget(null)
      if (!isAvatarCropOpen) {
        clearSelectedAvatarSource()
      }
    }
  }

  async function handleResetPassword() {
    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      toast.error('Sign in before requesting a password reset')
      return
    }

    setSavingTarget('resetPassword')
    try {
      await delay()
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ email: trimmedEmail }),
      })
      const payload = (await response.json().catch(() => null)) as { error?: string } | null

      if (!response.ok) {
        throw new Error(payload?.error || 'Reset password failed')
      }

      toast.success('Check your email for reset instructions.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Reset password failed')
    } finally {
      setSavingTarget(null)
    }
  }

  async function copyApiKey() {
    await navigator.clipboard.writeText(apiKey)
    toast.success('API key copied')
  }

  async function regenerateApiKey() {
    setSavingTarget('apiKey')
    await delay()
    const nextKey = `pk_live_mock_${crypto.randomUUID().replaceAll('-', '').slice(0, 22)}`
    setValue('apiKey', nextKey, { shouldDirty: true, shouldValidate: true })
    window.setTimeout(persistCurrentSettings, 0)
    setSavingTarget(null)
    toast.success('API key regenerated')
  }

  async function revokeSession(sessionId: string) {
    setSavingTarget('session')
    await delay()
    setSessions((current) => current.filter((item) => item.id !== sessionId))
    setSavingTarget(null)
    toast.success('Session revoked.')
  }

  const currentAccent = ACCENT_OPTIONS.find((option) => option.value === selectedAccent) ?? ACCENT_OPTIONS[0]
  const initials = getInitial(email, username)
  const avatarImage = avatarPreview || watchedValues.avatarUrl || ''

  return (
    <PrometheusShell>
      <div className="min-h-full bg-[linear-gradient(180deg,rgba(19,20,26,0.9)_0%,rgba(9,10,13,0.94)_100%)] px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="-ml-2 mb-4 text-white/62"
                onClick={() => router.push('/settings')}
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <h1 className="text-3xl font-bold tracking-tight text-white">Profile Settings</h1>
              <p className="mt-2 text-sm text-white/50">Manage your account, security, and workspace preferences</p>
            </div>
            <StatusPill saving={savingPreference !== null} accent={currentAccent.hex} />
          </header>

          <div className="space-y-5">
            <ProfileCard>
              <SectionTitle title="Account Info" />
              <div className="flex flex-col gap-6 sm:flex-row">
                <div className="flex shrink-0 flex-col items-start gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAvatarUploading}
                    className="group relative flex size-20 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#6366f1] text-2xl font-bold text-white shadow-[0_18px_54px_-24px_rgba(99,102,241,0.95)]"
                    style={{ background: avatarImage ? undefined : 'var(--accent, #6366f1)' }}
                    aria-label="Upload avatar"
                    aria-describedby="avatar-upload-status"
                  >
                    {avatarImage ? (
                      // Local object URLs are not compatible with next/image.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initials
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-disabled:opacity-100">
                      {isAvatarUploading ? (
                        <InlineLoadingAnimation size={20} label="Uploading avatar" />
                      ) : (
                        <Upload className="size-5" />
                      )}
                    </span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <div id="avatar-upload-status" className="text-xs text-white/42">
                    {isAvatarUploading ? `Uploading avatar: ${avatarUploadProgress}%` : 'JPG, PNG, or WebP under 5MB'}
                  </div>
                  <p className="sr-only" aria-live="polite">
                    {isAvatarUploading ? `Uploading avatar, ${avatarUploadProgress}% complete.` : ''}
                  </p>
                </div>

                <div className="min-w-0 flex-1 space-y-5">
                  <FieldRow label="Username" error={errors.username?.message}>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        {...register('username')}
                        className="h-10 rounded-[14px] border-white/16 bg-white/[0.06] text-white/90 focus:border-[#6366f1]/70 focus:ring-[#6366f1]/20"
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={savingTarget === 'username'}
                        onClick={() => void saveTextField('username')}
                        className="h-10 rounded-[16px] border-[#6366f1]/80 bg-[#6366f1] px-4 text-white shadow-[0_18px_54px_-24px_rgba(99,102,241,0.95)] hover:border-[#818cf8] hover:bg-[#5558e8]"
                      >
                        {savingTarget === 'username' ? (
                          <InlineLoadingAnimation size={16} label="Saving username" />
                        ) : null}
                        {savedTarget === 'username' ? 'Saved ✓' : 'Change Username'}
                      </Button>
                    </div>
                  </FieldRow>

                  <FieldRow label="Email Address">
                    <div className="rounded-[14px] border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white/42">
                      {authLoading ? (
                        <span className="inline-flex items-center gap-2">
                          <InlineLoadingAnimation size={16} label="Loading email" />
                          <span>Loading email...</span>
                        </span>
                      ) : email || 'No email available'}
                    </div>
                  </FieldRow>

                  <FieldRow
                    label="Display Name"
                    description="How you appear to team members and clients. Separate from username."
                    error={errors.displayName?.message}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        {...register('displayName')}
                        onBlur={() => void saveTextField('displayName')}
                        className="h-10 rounded-[14px] border-white/16 bg-white/[0.06] text-white/90 focus:border-[#6366f1]/70 focus:ring-[#6366f1]/20"
                      />
                      <LiquidChromeButton
                        type="button"
                        variant="primary"
                        size="sm"
                        liquid
                        ripple
                        loading={savingTarget === 'displayName'}
                        success={savedTarget === 'displayName'}
                        disabled={savingTarget === 'displayName'}
                        onClick={() => void saveTextField('displayName')}
                      >
                        {savedTarget === 'displayName' ? 'Saved ✓' : 'Save Name'}
                      </LiquidChromeButton>
                    </div>
                  </FieldRow>

                  <FieldRow
                    label="Bio"
                    description="A short profile that appears across your workspace and shared exports."
                    error={errors.bio?.message}
                  >
                    <div className="space-y-2">
                      <Textarea
                        {...register('bio')}
                        onBlur={() => void saveTextField('bio')}
                        className={cn(
                          'min-h-28 rounded-[14px] border-white/16 bg-white/[0.06] text-white/90 focus:border-[#6366f1]/70 focus:ring-[#6366f1]/20',
                          bio.length >= 450 && 'border-amber-400/60',
                        )}
                      />
                      <div className={cn('text-right text-xs text-white/38', bio.length >= 450 && 'text-amber-300')}>
                        {bio.length}/500
                      </div>
                    </div>
                  </FieldRow>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <FieldRow label="Pronouns" error={errors.pronouns?.message}>
                      <div className="space-y-2">
                        <SelectField
                          value={pronounPreset}
                          options={PRONOUN_OPTIONS}
                          onChange={(value) => {
                            setValue('pronounPreset', value, { shouldDirty: true })
                            if (value !== 'custom') {
                              setValue('pronouns', value, { shouldDirty: true, shouldValidate: true })
                              void saveTextField('pronouns')
                            } else {
                              setValue('pronouns', '', { shouldDirty: true, shouldValidate: true })
                            }
                          }}
                        />
                        {pronounPreset === 'custom' ? (
                          <Input
                            {...register('pronouns')}
                            onBlur={() => void saveTextField('pronouns')}
                            placeholder="Add your pronouns"
                            className="h-10 rounded-[14px] border-white/16 bg-white/[0.06] text-white/90 focus:border-[#6366f1]/70 focus:ring-[#6366f1]/20"
                          />
                        ) : null}
                      </div>
                    </FieldRow>

                    <FieldRow label="Location" error={errors.location?.message}>
                      <Input
                        {...register('location')}
                        onBlur={() => void saveTextField('location')}
                        placeholder="City, country"
                        className="h-10 rounded-[14px] border-white/16 bg-white/[0.06] text-white/90 focus:border-[#6366f1]/70 focus:ring-[#6366f1]/20"
                      />
                    </FieldRow>
                  </div>
                </div>
              </div>
            </ProfileCard>

            <ProfileCard>
              <SectionTitle title="Workspace Customization" withDivider />
              <div className="space-y-6">
                <PreferenceBlock label="Interface Theme" saving={savingPreference === 'theme'}>
                  <ThemeSelector
                    value={selectedTheme}
                    onChange={(nextTheme) => {
                      updatePreference('theme', 'theme', nextTheme)
                    }}
                  />
                </PreferenceBlock>

                <PreferenceBlock label="Primary Font" saving={savingPreference === 'font'}>
                  <FontSelector
                    value={selectedFont}
                    onChange={(nextFont) => updatePreference('font', 'fontPreference', nextFont)}
                  />
                </PreferenceBlock>

                <PreferenceBlock label="Accent Color" saving={savingPreference === 'accent'}>
                  <AccentPicker value={selectedAccent} onChange={(accent) => updatePreference('accent', 'accent', accent)} />
                </PreferenceBlock>

                <PreferenceBlock label="Interface Density" saving={savingPreference === 'density'}>
                  <SegmentedControl
                    options={DENSITY_OPTIONS}
                    value={selectedDensity}
                    onChange={(density) => updatePreference('density', 'density', density)}
                  />
                </PreferenceBlock>

                <PreferenceBlock label="Sidebar" saving={savingPreference === 'sidebar'}>
                  <SegmentedControl
                    options={SIDEBAR_OPTIONS}
                    value={selectedSidebar}
                    onChange={(sidebar) => updatePreference('sidebar', 'sidebar', sidebar)}
                  />
                </PreferenceBlock>
              </div>
            </ProfileCard>

            <ProfileCard>
              <SectionTitle title="Notifications & Preferences" withDivider />
              <div className="space-y-6">
                <PreferenceBlock label="Email Notifications" saving={savingPreference === 'notifications'}>
                  <div className="space-y-3">
                    <NotificationToggle
                      label="Marketing announcements"
                      description="Product launches, offers, and event invites."
                      checked={notificationPreferences.email.marketing}
                      onChange={(checked) => updateNestedPreference('notifications', 'notificationPreferences.email.marketing', checked)}
                    />
                    <NotificationToggle
                      label="Security alerts"
                      description="Critical account activity and login warnings."
                      checked={notificationPreferences.email.security}
                      onChange={(checked) => updateNestedPreference('notifications', 'notificationPreferences.email.security', checked)}
                    />
                    <NotificationToggle
                      label="Product updates"
                      description="New workflows, fixes, and shipping notes."
                      checked={notificationPreferences.email.updates}
                      onChange={(checked) => updateNestedPreference('notifications', 'notificationPreferences.email.updates', checked)}
                    />
                  </div>
                </PreferenceBlock>

                <PreferenceBlock label="Push Notifications" saving={savingPreference === 'notifications'}>
                  <div className="space-y-3">
                    <NotificationToggle
                      label="Browser push"
                      description="Desktop browser alerts for exports and renders."
                      checked={notificationPreferences.push.browser}
                      onChange={(checked) => updateNestedPreference('notifications', 'notificationPreferences.push.browser', checked)}
                    />
                  </div>
                </PreferenceBlock>

                <PreferenceBlock label="In-App Notifications" saving={savingPreference === 'notifications'}>
                  <div className="space-y-3">
                    <NotificationToggle
                      label="Real-time activity stream"
                      description="Inline updates for renders, exports, and project activity."
                      checked={notificationPreferences.inApp.realtime}
                      onChange={(checked) => updateNestedPreference('notifications', 'notificationPreferences.inApp.realtime', checked)}
                    />
                  </div>
                </PreferenceBlock>

                <div className="grid gap-4 sm:grid-cols-2">
                  <PreferenceBlock label="Default Export Quality" saving={savingPreference === 'export'}>
                    <SelectField
                      value={defaultExportQuality}
                      options={EXPORT_QUALITY_OPTIONS}
                      onChange={(value) => updatePreference('export', 'defaultExportQuality', value)}
                    />
                  </PreferenceBlock>
                  <PreferenceBlock label="Default Format" saving={savingPreference === 'export'}>
                    <SelectField
                      value={defaultFormat}
                      options={EXPORT_FORMAT_OPTIONS}
                      onChange={(value) => updatePreference('export', 'defaultFormat', value)}
                    />
                  </PreferenceBlock>
                </div>
              </div>
            </ProfileCard>

            <ProfileCard>
              <SectionTitle title="Security" withDivider />
              <div className="space-y-4">
                <SecurityRow
                  icon={Lock}
                  label="Password"
                  value="••••••••"
                  action={
                    <Button type="button" size="sm" variant="ghost" disabled={savingTarget === 'resetPassword'} onClick={() => void handleResetPassword()}>
                      {savingTarget === 'resetPassword' ? (
                        <InlineLoadingAnimation size={16} label="Requesting password reset" />
                      ) : null}
                      Reset Password
                    </Button>
                  }
                />

                <SecurityRow
                  icon={ShieldCheck}
                  label="Multi-Factor Authentication"
                  value="Add an extra layer of security to your account"
                  action={
                    <Button asChild size="sm" className="border-[#6366f1]/80 bg-[#6366f1] text-white hover:border-[#818cf8] hover:bg-[#5558e8]">
                      <Link href="/settings/profile/mfa">Manage MFA</Link>
                    </Button>
                  }
                />

                <ApiKeyField
                  apiKey={apiKey}
                  revealed={apiRevealed}
                  saving={savingTarget === 'apiKey'}
                  onCopy={() => void copyApiKey()}
                  onRegenerate={() => void regenerateApiKey()}
                  onRevealChange={setApiRevealed}
                />

                <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white">Active Sessions</div>
                      <div className="mt-1 text-xs text-white/42">Current browser and recent mock sign-ins.</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {sessions.map((item) => {
                      const SessionIcon = item.icon
                      return (
                        <div key={item.id} className="flex items-center justify-between gap-3 rounded-[14px] border border-white/10 bg-white/[0.03] p-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/54">
                              <SessionIcon className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-sm font-medium text-white/82">
                                <span className="truncate">{item.device}</span>
                                {item.current ? (
                                  <span className="rounded-full border border-[#6366f1]/36 bg-[#6366f1]/14 px-2 py-0.5 text-[10px] text-[#c7d2fe]">
                                    Current
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-1 truncate text-xs text-white/42">
                                {item.location} · {item.updatedAt}
                              </div>
                            </div>
                          </div>
                          {!item.current ? (
                            <Button type="button" size="sm" variant="ghost" disabled={savingTarget === 'session'} onClick={() => void revokeSession(item.id)}>
                              Revoke
                            </Button>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </ProfileCard>

            <ProfileCard>
              <SectionTitle title="Data & Privacy" withDivider />
              <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded-[18px] border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">Data Export</div>
                    <div className="mt-1 text-xs leading-5 text-white/42">Download a ZIP of all your project metadata and settings.</div>
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => toast.info('Preparing your data export…')}>
                    <Database className="size-4" />
                    Export My Data
                  </Button>
                </div>

                <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                  <NotificationToggle
                    label="Share anonymized usage data to improve AI recommendations"
                    description="Helps us tune song matching and clip detection for your workflow."
                    checked={usageAnalytics}
                    onChange={(checked) => updatePreference('analytics', 'usageAnalytics', checked)}
                  />
                </div>
              </div>
            </ProfileCard>

            <DangerZone
              checked={dangerChecked}
              revealed={dangerRevealed}
              onCheckedChange={setDangerChecked}
              onDeactivateClick={() => setDeactivateOpen(true)}
              onReveal={() => setDangerRevealed(true)}
            />
          </div>
        </div>
      </div>

      <DeactivateModal
        open={deactivateOpen}
        projectCount={12}
        onClose={() => setDeactivateOpen(false)}
        onDeactivate={() => router.push('/goodbye')}
      />
      <AvatarCropModal
        imageSrc={avatarCropSource || ''}
        isOpen={isAvatarCropOpen && Boolean(avatarCropSource)}
        onClose={clearSelectedAvatarSource}
        onCropComplete={handleAvatarCropComplete}
      />
    </PrometheusShell>
  )
}

function ProfileCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <GlassCard
      as="section"
      // Keep the cards visible on first paint; motion should enhance, not gate content.
      initial={false}
      className={cn(
        'p-5',
        className,
      )}
      staggerChildren
    >
      {children}
    </GlassCard>
  )
}

function SectionTitle({ title, withDivider = false }: { title: string; withDivider?: boolean }) {
  return (
    <div className={cn('mb-5', withDivider && 'border-t border-white/10 pt-5')}>
      <h2 className="text-base font-semibold text-white">{title}</h2>
    </div>
  )
}

function FieldRow({
  children,
  description,
  error,
  label,
}: {
  children: React.ReactNode
  description?: string
  error?: string
  label: string
}) {
  return (
    <label className="block">
      <span className="text-sm text-white/50">{label}</span>
      {description ? <span className="mt-1 block text-xs leading-5 text-white/38">{description}</span> : null}
      <div className="mt-2">{children}</div>
      {error ? <span className="mt-1 block text-xs text-rose-400">{error}</span> : null}
    </label>
  )
}

function PreferenceBlock({
  children,
  label,
  saving,
}: {
  children: React.ReactNode
  label: string
  saving?: boolean
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-white/82">{label}</div>
        {saving ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-white/42">
            <InlineLoadingAnimation size={12} label={`Saving ${label}`} />
            Saving
          </span>
        ) : null}
      </div>
      {children}
    </div>
  )
}

function ThemeSelector({ onChange, value }: { onChange: (value: ThemeValue) => void; value: ThemeValue }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {THEME_OPTIONS.map((option) => {
        const selected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'group relative overflow-visible rounded-[18px] border bg-white/[0.03] p-3 text-left transition-all duration-150 ease-out hover:-translate-y-1 hover:border-white/[0.12]',
              selected ? 'border-[#6366f1]/36 shadow-[0_0_30px_rgba(99,102,241,0.24)]' : 'border-white/10',
            )}
          >
            <div
              className="h-12 rounded-[12px] border border-white/10"
              style={{
                background: `linear-gradient(180deg, ${option.background} 0%, ${option.accent}22 100%)`,
              }}
            />
            <div className="mt-3 flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-medium text-white">{option.label}</div>
                <div className="mt-1 text-xs text-white/42">{option.description}</div>
              </div>
              {selected ? (
                <span className="flex size-6 items-center justify-center rounded-full bg-[#6366f1] text-white">
                  <Check className="size-3.5" />
                </span>
              ) : null}
            </div>
            <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-3 hidden w-52 -translate-x-1/2 rounded-2xl border border-white/10 bg-[#08080c]/95 p-3 shadow-2xl group-hover:block">
              <div
                className="rounded-xl border p-3"
                style={{
                  backgroundColor: option.background,
                  borderColor: `${option.accent}55`,
                  color: option.foreground,
                }}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span>Workspace</span>
                  <span
                    className="rounded-full px-2 py-0.5"
                    style={{ backgroundColor: `${option.accent}22`, color: option.accent }}
                  >
                    Live
                  </span>
                </div>
                <div className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: `${option.accent}18` }}>
                  Accent preview
                </div>
                <div className="mt-3 text-[11px]" style={{ color: `${option.foreground}aa` }}>
                  Hover preview of the full theme palette.
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function FontSelector({ onChange, value }: { onChange: (value: FontValue) => void; value: FontValue }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {FONT_OPTIONS.map((option) => {
        const selected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'group relative overflow-visible rounded-[18px] border bg-white/[0.03] p-4 text-left transition-all duration-150 ease-out hover:-translate-y-1 hover:border-white/[0.12]',
              selected ? 'border-[#6366f1]/36 shadow-[0_0_30px_rgba(99,102,241,0.24)]' : 'border-white/10',
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-white">{option.label}</div>
                <div className="mt-1 text-xs text-white/42">Global UI font</div>
              </div>
              {selected ? (
                <span className="flex size-6 items-center justify-center rounded-full bg-[#6366f1] text-white">
                  <Check className="size-3.5" />
                </span>
              ) : null}
            </div>
            <div className="mt-3 text-sm text-white/72" style={{ fontFamily: option.stack }}>
              The quick brown fox jumps over the lazy dog.
            </div>
            <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-3 hidden w-60 -translate-x-1/2 rounded-2xl border border-white/10 bg-[#08080c]/95 p-4 text-white shadow-2xl group-hover:block">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">Preview</div>
              <div className="mt-3 text-xl leading-tight" style={{ fontFamily: option.stack }}>
                The quick brown fox jumps over the lazy dog.
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function AccentPicker({ onChange, value }: { onChange: (value: AccentValue) => void; value: AccentValue }) {
  return (
    <div className="flex flex-wrap gap-3">
      {ACCENT_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.label}
          onClick={() => onChange(option.value)}
          className={cn(
            'size-8 rounded-full border border-white/10 transition-transform duration-150 ease-out hover:scale-110',
            option.className,
            value === option.value && 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0d]',
          )}
        >
          <span className="sr-only">{option.label}</span>
        </button>
      ))}
    </div>
  )
}

function SegmentedControl<T extends string>({
  onChange,
  options,
  value,
}: {
  onChange: (value: T) => void
  options: Array<{ value: T; label: string }>
  value: T
}) {
  return (
    <div className="flex flex-wrap rounded-[18px] border border-white/10 bg-white/[0.03] p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'min-h-8 flex-1 rounded-[14px] px-3 text-sm transition-all duration-150 ease-out',
            value === option.value ? 'bg-[#6366f1] text-white shadow-[0_0_30px_rgba(99,102,241,0.24)]' : 'text-white/52 hover:bg-white/[0.06] hover:text-white',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function NotificationToggle({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean
  description?: string
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <button type="button" className="min-w-0 flex-1 pr-4 text-left" onClick={() => onChange(!checked)}>
        <span className="block text-sm text-white/72">{label}</span>
        {description ? <span className="mt-1 block text-xs leading-5 text-white/38">{description}</span> : null}
      </button>
      <div className="flex w-14 shrink-0 justify-end">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={cn(
            'relative h-6 w-12 rounded-full border transition-all duration-150 ease-out',
            checked ? 'border-[#6366f1]/36 bg-[#6366f1]' : 'border-white/10 bg-white/[0.06]',
          )}
        >
          <span
            className={cn(
              'absolute left-1 top-1/2 size-4 -translate-y-1/2 rounded-full bg-white transition-transform duration-150 ease-out',
              checked ? 'translate-x-6' : 'translate-x-0',
            )}
          />
        </button>
      </div>
    </div>
  )
}

function SelectField<T extends string>({
  onChange,
  options,
  value,
}: {
  onChange: (value: T) => void
  options: Array<{ value: T; label: string }>
  value: T
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className="h-10 w-full rounded-[14px] border border-white/16 bg-[#0a0a0d] px-3 text-sm text-white/90 outline-none transition-colors focus:border-[#6366f1]/70 focus:ring-2 focus:ring-[#6366f1]/20"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

function SecurityRow({
  action,
  icon: Icon,
  label,
  value,
}: {
  action: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[18px] border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/54">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-white">{label}</div>
          <div className="mt-1 text-sm text-white/42">{value}</div>
        </div>
      </div>
      {action}
    </div>
  )
}

function ApiKeyField({
  apiKey,
  onCopy,
  onRegenerate,
  onRevealChange,
  revealed,
  saving,
}: {
  apiKey: string
  onCopy: () => void
  onRegenerate: () => void
  onRevealChange: (revealed: boolean) => void
  revealed: boolean
  saving: boolean
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <KeyRound className="size-4 text-white/54" />
            API Key
          </div>
          <div className="mt-2 break-all rounded-[14px] border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-white/62">
            {getMaskedApiKey(apiKey, revealed)}
          </div>
          <Link href="/pricing" className="mt-2 inline-flex text-xs text-[#c7d2fe] hover:text-white">
            Upgrade to Cinema for API access
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => onRevealChange(!revealed)}>
            {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {revealed ? 'Hide' : 'Reveal'}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onCopy}>
            <Copy className="size-4" />
            Copy
          </Button>
          <Button type="button" size="sm" variant="secondary" disabled={saving} onClick={onRegenerate}>
            {saving ? (
              <InlineLoadingAnimation size={16} label="Regenerating API key" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Regenerate
          </Button>
        </div>
      </div>
    </div>
  )
}

function DangerZone({
  checked,
  onCheckedChange,
  onDeactivateClick,
  onReveal,
  revealed,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  onDeactivateClick: () => void
  onReveal: () => void
  revealed: boolean
}) {
  return (
    <section className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.02] p-5 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-rose-400/20 bg-rose-500/10 text-rose-400">
          <ShieldAlert className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-rose-400">Danger Zone</h2>
          <p className="mt-1 text-sm text-rose-300/60">Irreversible account actions. Proceed with caution.</p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onReveal}
            className="mt-4 justify-start border-rose-400/20 text-rose-400 hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-300"
          >
            Deactivate Account
          </Button>

          <AnimatePresence initial={false}>
            {revealed ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 rounded-[18px] border border-rose-400/20 bg-rose-500/[0.03] p-4">
                  <label className="flex items-start gap-3 text-sm text-rose-300/80">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => onCheckedChange(event.target.checked)}
                      className="mt-1"
                    />
                    I understand this will permanently delete all my projects, exports, and account data.
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={!checked}
                    onClick={onDeactivateClick}
                    className="mt-4 bg-rose-500 text-white hover:bg-rose-500/90"
                  >
                    Continue
                  </Button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}

function DeactivateModal({
  onClose,
  onDeactivate,
  open,
  projectCount,
}: {
  onClose: () => void
  onDeactivate: () => void
  open: boolean
  projectCount: number
}) {
  const [countdown, setCountdown] = React.useState(5)

  React.useEffect(() => {
    if (!open) {
      setCountdown(5)
      return
    }

    if (countdown === 0) return
    const timer = window.setTimeout(() => setCountdown((current) => Math.max(0, current - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [countdown, open])

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="border-white/10 bg-[#0a0a0d]/95 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-rose-400">Are you absolutely sure?</DialogTitle>
          <DialogDescription className="text-rose-300/70">This is a permanent account action.</DialogDescription>
        </DialogHeader>
        <div className="px-6 py-4">
          <ul className="space-y-2 text-sm text-rose-300/80">
            <li>All {projectCount} projects and their versions will be deleted</li>
            <li>All AI-generated exports and renders will be lost</li>
            <li>Your subscription and billing history will be removed</li>
            <li>This action is irreversible</li>
          </ul>
        </div>
        <DialogFooter className="flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center">
          <Button type="button" variant="ghost" className="text-white" onClick={onClose}>
            No, Keep My Account
          </Button>
          <Button
            type="button"
            disabled={countdown > 0}
            onClick={onDeactivate}
            className="border-rose-400/20 bg-rose-500 text-white hover:bg-rose-500/90"
          >
            Deactivate Account{countdown > 0 ? ` (${countdown})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StatusPill({ accent, saving }: { accent: string; saving: boolean }) {
  return (
    <div className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 text-xs text-white/50">
      {saving ? (
        <>
          <InlineLoadingAnimation size={16} label="Saving preferences" />
          <span>Saving preferences</span>
        </>
      ) : (
        <>
          <span className="size-2 rounded-full" style={{ background: accent }} />
          <span>Synced preferences</span>
        </>
      )}
    </div>
  )
}
