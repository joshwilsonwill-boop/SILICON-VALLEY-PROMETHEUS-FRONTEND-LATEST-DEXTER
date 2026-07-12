'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const createProjectSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(100, 'Keep title under 100 characters'),
  description: z.string().trim().max(500, 'Keep description under 500 characters').optional(),
  template: z.enum(['blank', 'social-media', 'youtube', 'tiktok', 'instagram']),
})

type CreateProjectFormValues = z.infer<typeof createProjectSchema>

const TEMPLATE_OPTIONS: Array<{ value: CreateProjectFormValues['template']; label: string; ratio: string }> = [
  { value: 'blank', label: 'Blank', ratio: 'Freeform' },
  { value: 'social-media', label: 'Social Media', ratio: '4:5' },
  { value: 'youtube', label: 'YouTube', ratio: '16:9' },
  { value: 'tiktok', label: 'TikTok', ratio: '9:16' },
  { value: 'instagram', label: 'Instagram', ratio: '1:1' },
]

export interface CreateProjectModalProps {
  open: boolean
  onClose: () => void
}

export function CreateProjectModal({ open, onClose }: CreateProjectModalProps) {
  const router = useRouter()
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      title: '',
      description: '',
      template: 'blank',
    },
  })

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
    control,
  } = form

  const selectedTemplate = useWatch({ control, name: 'template' })

  React.useEffect(() => {
    if (!open) {
      reset()
      setSubmitError(null)
    }
  }, [open, reset])

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)

    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(values),
    })
    const payload = (await response.json().catch(() => null)) as
      | { success?: true; project?: { id: string } }
      | { success?: false; error?: { message?: string } }
      | null

    if (!response.ok || !payload?.success || !payload.project?.id) {
      setSubmitError(payload && 'error' in payload && payload.error?.message ? payload.error.message : 'Unable to create project.')
      return
    }

    onClose()
    router.push(`/editor/${payload.project.id}`)
  })

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-xl border-white/10 bg-[#0a0a0d] text-white">
        <DialogHeader>
          <DialogTitle>Create new project</DialogTitle>
          <DialogDescription className="text-white/54">
            Start a blank production workspace or pick a preset aspect ratio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm text-white/68" htmlFor="create-project-title">
              Title
            </label>
            <Input
              id="create-project-title"
              autoFocus
              {...register('title')}
              className="h-11 rounded-xl border-white/16 bg-white/[0.06] text-white"
            />
            {errors.title ? <p className="text-xs text-rose-300">{errors.title.message}</p> : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-white/68" htmlFor="create-project-description">
              Description
            </label>
            <Textarea
              id="create-project-description"
              {...register('description')}
              className="min-h-24 rounded-xl border-white/16 bg-white/[0.06] text-white"
            />
            {errors.description ? <p className="text-xs text-rose-300">{errors.description.message}</p> : null}
          </div>

          <div className="space-y-3">
            <label className="text-sm text-white/68">Template</label>
            <div className="grid gap-3 sm:grid-cols-2">
              {TEMPLATE_OPTIONS.map((template) => (
                <button
                  key={template.value}
                  type="button"
                  onClick={() => setValue('template', template.value, { shouldDirty: true })}
                  className={cn(
                    'rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-white/20',
                    selectedTemplate === template.value && 'border-[var(--theme-accent)] bg-white/[0.06]',
                  )}
                >
                  <div className="text-sm font-medium text-white">{template.label}</div>
                  <div className="mt-1 text-xs text-white/42">{template.ratio}</div>
                </button>
              ))}
            </div>
          </div>

          {submitError ? (
            <div className="rounded-xl border border-rose-300/20 bg-rose-300/[0.08] p-3 text-sm text-rose-100">
              {submitError}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-white text-black hover:bg-white/90">
              {isSubmitting ? <InlineLoadingAnimation size={16} label="Creating project" /> : null}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
