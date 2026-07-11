import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import test from 'node:test'

const ROOT = process.cwd()
const SOURCE_ROOTS = ['app', 'components']
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx'])

function extension(path: string) {
  const match = path.match(/\.[^.]+$/)
  return match?.[0] || ''
}

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

test('contains no legacy spinner, skeleton, or alternate loader implementation', () => {
  const forbidden = [
    { label: 'CSS spinner animation', pattern: /\banimate-spin\b/ },
    { label: 'legacy typographic loader', pattern: /\bMinimalTypographicLoader\b/ },
    { label: 'legacy AI response loader', pattern: /\bAiResponseLoader\b/ },
    { label: 'loading skeleton component', pattern: /\b[A-Za-z0-9_]*Skeleton[A-Za-z0-9_]*\b/ },
    { label: 'Lucide spinner icon', pattern: /\b(?:Loader2|LoaderCircle)\b/ },
  ]
  const violations: string[] = []

  for (const root of SOURCE_ROOTS) {
    for (const path of walk(join(ROOT, root))) {
      if (!SOURCE_EXTENSIONS.has(extension(path))) continue
      if (path.includes('/__tests__/')) continue
      const source = readFileSync(path, 'utf8')

      for (const rule of forbidden) {
        if (rule.pattern.test(source)) {
          violations.push(`${relative(ROOT, path)}: ${rule.label}`)
        }
      }
    }
  }

  assert.deepEqual(violations, [])
})

test('removes old loader CSS and raster assets', () => {
  const css = readFileSync(join(ROOT, 'app/globals.css'), 'utf8')
  const forbiddenCss = [
    'prometheus-infinity-mark',
    'ai-loader-wrapper',
    'ai-loader-letters',
    'loader-letter',
    'loader-orb',
    '@keyframes loader-rotate',
    '@keyframes loader-letter-anim',
  ]

  assert.deepEqual(
    forbiddenCss.filter((token) => css.includes(token)),
    [],
  )
  assert.equal(
    existsSync(join(ROOT, 'public/loaders/prometheus-infinity-loader.gif')),
    false,
  )
})

test('uses a Canvas fallback for every auth and billing Suspense boundary', () => {
  const suspenseFiles = [
    'app/(auth)/forgot-password/page.tsx',
    'app/(auth)/login/page.tsx',
    'app/(auth)/signup/page.tsx',
    'app/(auth)/verify/page.tsx',
    'app/settings/billing/page.tsx',
    'app/settings/billing/success/page.tsx',
    'components/auth/AuthShell.tsx',
  ]
  const violations = suspenseFiles.filter((path) => {
    const source = readFileSync(join(ROOT, path), 'utf8')
    return /fallback=\{null\}/.test(source) || !source.includes('LoadingAnimation')
  })

  assert.deepEqual(violations, [])
})

test('replaces known loading pulse, dot, and progress-animation surfaces', () => {
  const loadingPulseFiles = [
    'app/projects/page.tsx',
    'components/editor/CircularToast.tsx',
    'components/editor/EditorHeader.tsx',
    'components/editor/MediaBin.tsx',
    'components/editor/MediaBinV2.tsx',
    'components/editor/MotionBrainCanvas.tsx',
    'components/editor/MotionBrainPanel.tsx',
    'components/editor/VideoUploader.tsx',
    'components/editor/cinematic-export-cluster.tsx',
    'components/editor/durable-job-progress.tsx',
    'components/editor/frame-preview-card.tsx',
    'components/editor/viral-clip-split-preview.tsx',
    'components/projects/project-card.tsx',
    'components/ui/agent-plan.tsx',
    'components/ui/music-player.tsx',
  ]
  const violations = loadingPulseFiles.flatMap((path) => {
    const source = readFileSync(join(ROOT, path), 'utf8')
    const findings: string[] = []
    if (source.includes('animate-pulse')) findings.push(`${path}: loading pulse`)
    if (!source.includes('InlineLoadingAnimation')) findings.push(`${path}: missing Canvas loader`)
    return findings
  })

  const uploadSource = readFileSync(join(ROOT, 'components/video-upload-interface.tsx'), 'utf8')
  const uploadDialogSource = readFileSync(
    join(ROOT, 'components/editor/editor-new-project-upload-dialog.tsx'),
    'utf8',
  )
  if (/animate=\{\{ width:[\s\S]*uploadProgress/.test(uploadSource)) {
    violations.push('components/video-upload-interface.tsx: animated upload bar')
  }
  if (/animate=\{\{ width:[\s\S]*uploadProgress/.test(uploadDialogSource)) {
    violations.push('components/editor/editor-new-project-upload-dialog.tsx: animated upload bar')
  }

  assert.deepEqual(violations, [])
})

test('pairs every text-only authentication action state with the Canvas loader', () => {
  const actionFiles = [
    'app/settings/page.tsx',
    'components/auth/ForgotPasswordForm.tsx',
    'components/auth/LoginForm.tsx',
    'components/auth/ResetPasswordForm.tsx',
    'components/auth/SignupForm.tsx',
    'components/auth/SocialAuthButtons.tsx',
    'components/auth/VerifyForm.tsx',
    'components/PricingSection.tsx',
  ]
  const violations = actionFiles.filter((path) => {
    const source = readFileSync(join(ROOT, path), 'utf8')
    return !source.includes('InlineLoadingAnimation')
  })

  assert.deepEqual(violations, [])
})

test('contains no determinate bars in active loading and processing surfaces', () => {
  const checks = [
    {
      path: 'components/editor/music-recommendation-showcase.tsx',
      patterns: [/phase\.progress/, /MusicRecommendationSkeleton/],
    },
    {
      path: 'components/social/PostStatusTracker.tsx',
      patterns: [/<Progress\b/, /width:\s*`\$\{item\.progress\}%`/],
    },
    {
      path: 'app/editor/[id]/page.tsx',
      patterns: [/width:\s*`\$\{Math\.max\(4, progressPercent\)\}%`/],
    },
  ]

  const violations = checks.flatMap(({ path, patterns }) => {
    const source = readFileSync(join(ROOT, path), 'utf8')
    return patterns
      .filter((pattern) => pattern.test(source))
      .map((pattern) => `${path}: ${pattern.source}`)
  })

  assert.deepEqual(violations, [])
})

test('pairs every remaining loading branch with the Canvas animation', () => {
  const checks = [
    {
      path: 'components/editor/PreviewCanvas.tsx',
      forbidden: [/sourceStageError\s*\?\s*<AlertCircle[\s\S]{0,160}:\s*<Sparkles/],
    },
    {
      path: 'components/editor/viral-clip-trigger.tsx',
      required: [/processing\s*\?\s*\([\s\S]{0,160}<InlineLoadingAnimation/],
    },
    {
      path: 'components/video-upload-interface.tsx',
      forbidden: [
        /isSubmitting\s*\?\s*\([\s\S]{0,120}<Sparkles/,
        /isLoadingAirtableStylePreviews\s*\?\s*['"]Loading Airtable/,
      ],
    },
    {
      path: 'app/editor/[id]/page.tsx',
      forbidden: [/saveStatus === 'saving'\s*\?\s*<Sparkles/],
    },
    {
      path: 'app/settings/profile/page.tsx',
      forbidden: [/authLoading\s*\?\s*'Loading email/, /saving\s*\?\s*'Saving preferences'/],
    },
    {
      path: 'components/editor/DownloadDialog.tsx',
      forbidden: [/isDownloading\s*\?\s*'Downloading/],
    },
    {
      path: 'components/editor/SocialPostingPanelV2.tsx',
      required: [/loading\s*\?\s*\([\s\S]{0,240}<InlineLoadingAnimation/],
    },
  ]

  const violations = checks.flatMap(({ path, forbidden = [], required = [] }) => {
    const source = readFileSync(join(ROOT, path), 'utf8')
    return [
      ...forbidden
        .filter((pattern) => pattern.test(source))
        .map((pattern) => `${path}: forbidden ${pattern.source}`),
      ...required
        .filter((pattern) => !pattern.test(source))
        .map((pattern) => `${path}: missing ${pattern.source}`),
    ]
  })

  assert.deepEqual(violations, [])
})
