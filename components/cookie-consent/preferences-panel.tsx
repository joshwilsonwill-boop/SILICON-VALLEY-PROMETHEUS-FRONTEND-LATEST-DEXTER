'use client'

import * as React from 'react'

import { ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { COOKIE_CATEGORY_DETAILS, type CookieCategory } from '@/lib/cookies/cookie-config'

type CookiePreferencesPanelProps = {
  open: boolean
  currentPreferences: Record<CookieCategory, boolean>
  onOpenChange: (open: boolean) => void
  onSave: (input: Partial<Record<CookieCategory, boolean>>) => void
  onAcceptAll: () => void
  onRejectNonEssential: () => void
}

const COOKIE_CATEGORIES: CookieCategory[] = ['essential', 'analytics', 'preferences', 'marketing']

export function CookiePreferencesPanel({
  open,
  currentPreferences,
  onOpenChange,
  onSave,
  onAcceptAll,
  onRejectNonEssential,
}: CookiePreferencesPanelProps) {
  const [selection, setSelection] = React.useState<Record<CookieCategory, boolean>>(currentPreferences)

  React.useEffect(() => {
    if (open) setSelection(currentPreferences)
  }, [currentPreferences, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[min(100%-1.5rem,42rem)] overflow-y-auto border-white/15 bg-[#11111c] p-0 text-white shadow-[0_28px_100px_-42px_rgba(0,0,0,0.95)] sm:w-[min(100%-3rem,42rem)]">
        <DialogHeader className="border-b border-white/10 px-5 pb-5 pt-6 sm:px-6">
          <div className="mb-3 flex size-10 items-center justify-center rounded-lg border border-white/15 bg-white/[0.06]">
            <ShieldCheck className="size-5 text-white" aria-hidden="true" />
          </div>
          <DialogTitle className="text-xl font-semibold tracking-normal">Cookie preferences</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-white/60">
            Essential technologies keep Prometheus Studio secure and available. Choose whether we may use optional technologies.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-5 py-5 sm:px-6">
          {COOKIE_CATEGORIES.map((category) => {
            const detail = COOKIE_CATEGORY_DETAILS[category]
            const isEssential = category === 'essential'

            return (
              <section key={category} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{detail.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-white/58">{detail.description}</p>
                  </div>
                  <Switch
                    checked={isEssential ? true : selection[category]}
                    disabled={isEssential}
                    aria-label={`${detail.title} cookies`}
                    onCheckedChange={(checked) => {
                      if (!isEssential) setSelection((current) => ({ ...current, [category]: checked }))
                    }}
                  />
                </div>
                {isEssential ? <p className="mt-3 text-xs font-medium text-white/45">Always active</p> : null}
              </section>
            )
          })}
        </div>

        <DialogFooter className="flex-col gap-2 border-t border-white/10 px-5 py-5 sm:flex-row sm:flex-wrap sm:justify-end sm:px-6">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full border-white/20 bg-white/10 text-white hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/30 sm:w-auto"
            onClick={onRejectNonEssential}
          >
            Reject All Non-Essential
          </Button>
          <Button
            type="button"
            className="min-h-11 w-full bg-white text-black hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white/30 sm:w-auto"
            onClick={() => onSave(selection)}
          >
            Save Preferences
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full border-white/20 bg-white/10 text-white hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/30 sm:w-auto"
            onClick={onAcceptAll}
          >
            Accept All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
