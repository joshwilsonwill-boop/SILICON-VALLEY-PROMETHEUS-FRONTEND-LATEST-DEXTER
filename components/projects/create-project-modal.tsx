'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ArrowUp, LoaderCircle, Sparkles, X } from 'lucide-react'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

const createProjectSchema = z.object({
  prompt: z.string().trim().min(1, 'Tell Prometheus what you want to make.').max(500, 'Keep the idea under 500 characters.'),
})

type CreateProjectFormValues = z.infer<typeof createProjectSchema>

export interface CreateProjectModalProps {
  open: boolean
  onClose: () => void
}

function getProjectTitle(prompt: string) {
  const firstThought = prompt.trim().split(/[.?!\n]/)[0]?.trim() || 'Untitled project'
  return firstThought.slice(0, 100)
}

export function CreateProjectModal({ open, onClose }: CreateProjectModalProps) {
  const router = useRouter()
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      prompt: '',
    },
  })

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = form

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
      body: JSON.stringify({
        title: getProjectTitle(values.prompt),
        prompt: values.prompt.trim(),
      }),
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
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-2rem)] max-w-2xl rounded-md border-white/15 bg-[#0a0a0b] p-2 shadow-[0_28px_80px_-28px_rgba(0,0,0,0.96)]"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Create a project with Prometheus</DialogTitle>
          <DialogDescription>Describe the piece you want to make and Prometheus will prepare the project.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-2">
          <label className="sr-only" htmlFor="create-project-prompt">
            What do you want to make?
          </label>
          <div className="flex min-h-12 items-center gap-2 border border-white/12 bg-white/[0.03] p-1.5 transition-colors duration-200 focus-within:border-[#d3ad75]/75 focus-within:bg-white/[0.05]">
            <span className="flex size-9 shrink-0 items-center justify-center text-[#d3ad75]" aria-hidden="true">
              <Sparkles className="size-4" strokeWidth={1.5} />
            </span>
            <Input
              id="create-project-prompt"
              autoFocus
              autoComplete="off"
              placeholder="What do you want to make?"
              {...register('prompt')}
              className="h-10 min-w-0 border-0 bg-transparent px-0 text-base text-white placeholder:text-white/36 focus:border-0 focus:ring-0"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              aria-label="Generate project"
              className="flex size-10 shrink-0 items-center justify-center bg-[#d3ad75] text-black transition-colors duration-200 hover:bg-[#f1d09d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f1d09d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0b] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? <LoaderCircle className="size-4 animate-spin" strokeWidth={1.75} /> : <ArrowUp className="size-4" strokeWidth={1.75} />}
            </button>
            <DialogClose
              type="button"
              aria-label="Close project creator"
              className="flex size-10 shrink-0 items-center justify-center text-white/44 transition-colors duration-200 hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
            >
              <X className="size-4" strokeWidth={1.5} />
            </DialogClose>
          </div>

          {errors.prompt ? <p className="px-1 text-xs text-rose-300">{errors.prompt.message}</p> : null}
          {submitError ? <p role="alert" className="px-1 text-xs text-rose-300">{submitError}</p> : null}
        </form>
      </DialogContent>
    </Dialog>
  )
}
