'use client'

import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { Button } from '@/components/ui/button'

export function DeleteProjectDialog({ title, busy, error, onCancel, onConfirm }: {
  title: string | null
  busy: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog.Root open={title !== null} onOpenChange={(open) => { if (!open && !busy) onCancel() }}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[301] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/15 bg-[#090909] p-6 text-white shadow-2xl">
          <AlertDialog.Title className="text-xl font-semibold">Delete “{title}”?</AlertDialog.Title>
          <AlertDialog.Description className="mt-3 text-sm text-white/65">This permanently deletes the project and its associated edits. This cannot be undone.</AlertDialog.Description>
          {error ? <p role="alert" className="mt-3 text-sm text-red-400">{error}</p> : null}
          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel asChild><Button variant="outline" disabled={busy} onClick={onCancel}>Cancel</Button></AlertDialog.Cancel>
            <Button variant="destructive" disabled={busy} onClick={onConfirm}>{busy ? 'Deleting…' : 'Delete project'}</Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
