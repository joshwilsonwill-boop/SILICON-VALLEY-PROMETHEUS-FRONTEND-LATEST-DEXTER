'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Download, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useUserConnections } from '@/hooks/use-user-connections'
import { useConfiguredProviders } from '@/lib/oauth/client-capabilities'
import { getProviderMetadata } from '@/lib/oauth/provider-metadata'
import { isExportProviderConnected } from '@/lib/editor/export-connections'
import { downloadMedia } from '@/lib/editor/browser-download'
import type { ComputeQuote } from '@/lib/compute/policy'
import { useEditor } from './EditorContext'

export function ExportDrawer() {
  const { showExport, setShowExport, currentVideoUrl } = useEditor()
  const { connections, loading, error: connectionError, refresh } = useUserConnections()
  const configured = useConfiguredProviders()
  const [destination, setDestination] = useState('download')
  const [review, setReview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [quote, setQuote] = useState<ComputeQuote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [requestId, setRequestId] = useState('')
  const targets = configured.filter(provider => isExportProviderConnected(connections, provider))
  const cost = destination === 'download' ? 0 : quote?.cost
  const canExecute = Boolean(currentVideoUrl) && !busy && (destination === 'download' || Boolean(quote?.canAfford && targets.includes(destination)))

  useEffect(() => {
    if (!showExport) return
    setReview(false); setError(null); setQuote(null); setDestination('download'); setRequestId(crypto.randomUUID())
    const controller = new AbortController()
    fetch('/api/exports/quote?operation=export', { cache: 'no-store', signal: controller.signal }).then(async response => {
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Unable to check credit balance.')
      setQuote(payload)
    }).catch(caught => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Unable to check credits.') })
    return () => controller.abort()
  }, [showExport])

  async function execute() {
    if (!review || !canExecute || !currentVideoUrl) return
    setBusy(true); setError(null)
    try {
      if (destination === 'download') {
        await downloadMedia(currentVideoUrl, 'prometheus-source')
        toast.success('Source download started.')
      } else {
        const response = await fetch(`/api/export/${destination}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoUrl: currentVideoUrl, caption, title: caption || 'Prometheus video', confirmed: true, requestId }),
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error ?? 'Publishing failed. Please try again.')
        toast.success('Video submitted to the selected destination.')
      }
      setShowExport(false)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Export could not finish.'
      setError(message); toast.error(message)
    } finally { setBusy(false) }
  }

  return <Dialog open={showExport} onOpenChange={open => { if (!busy) setShowExport(open) }}>
    <DialogContent className="max-w-xl border-white/15 bg-[#0a0e15] text-white">
      <DialogHeader><DialogTitle>{review ? 'Review export' : 'Export video'}</DialogTitle>
        <DialogDescription className="text-white/60">Download the current source or send it to a connected destination. Edited rendering is unavailable in this export flow.</DialogDescription>
      </DialogHeader>
      {!review ? <div className="space-y-4">
        <label className="block text-sm">Destination
          <select aria-label="Export destination" value={destination} onChange={event => setDestination(event.target.value)} className="mt-2 block min-h-11 w-full rounded border border-white/20 bg-[#111820] px-3">
            <option value="download">Download current source</option>
            {targets.map(provider => <option key={provider} value={provider}>{getProviderMetadata(provider)?.name ?? provider}</option>)}
          </select>
        </label>
        {destination !== 'download' && <label className="block text-sm">Title / caption<textarea value={caption} onChange={event => setCaption(event.target.value)} maxLength={2200} className="mt-2 block w-full rounded border border-white/20 bg-transparent p-3" /></label>}
        <p className="text-sm text-white/60">The original media format, dimensions and audio are preserved. Timeline cuts, preview looks and captions are not rendered into this source file.</p>
        {loading && <p role="status" className="text-sm text-white/60">Checking account connections…</p>}
        {connectionError && <p role="alert" className="text-sm text-amber-200">Account status unavailable. <button className="underline" onClick={() => void refresh()}>Retry</button></p>}
        {!loading && targets.length === 0 && <p className="text-sm text-white/60">No configured publishing accounts are connected.</p>}
        <Link href="/settings/social-accounts" onClick={() => setShowExport(false)} className="inline-block min-h-11 py-3 text-sm text-[#38BDF8]">Manage accounts →</Link>
      </div> : <dl className="grid grid-cols-2 gap-3 rounded border border-white/15 p-4 text-sm">
        <dt className="text-white/60">Destination</dt><dd>{destination === 'download' ? 'Download current source' : getProviderMetadata(destination)?.name ?? destination}</dd>
        <dt className="text-white/60">Output</dt><dd>Original source; unchanged format and dimensions</dd>
        <dt className="text-white/60">Credits</dt><dd>{cost ?? 'Unavailable'}</dd>
        <dt className="text-white/60">Available balance</dt><dd>{quote ? `${quote.balance} credits` : 'Unavailable'}</dd>
        {caption && <><dt className="text-white/60">Caption</dt><dd className="break-words">{caption}</dd></>}
      </dl>}
      {destination === 'download' && <p className="text-xs text-white/55">Source download uses 0 compute credits.</p>}
      {destination !== 'download' && quote && !quote.canAfford && <p role="alert" className="text-sm text-amber-200">This requires {quote.cost} credit. You have {quote.balance}. <Link href="/settings/billing" className="underline">Open Billing</Link></p>}
      {!currentVideoUrl && <p role="alert" className="text-sm text-amber-200">Add source media before exporting.</p>}
      {error && <p role="alert" className="text-sm text-rose-200">{error}</p>}
      {busy && <p role="status" className="text-sm text-white/60">Submitting your approved export. Publishing cannot be recalled after the provider accepts it.</p>}
      <DialogFooter>
        <Button variant="outline" disabled={busy} onClick={() => review ? setReview(false) : setShowExport(false)}>{review ? 'Back' : 'Cancel'}</Button>
        {review && <Button variant="outline" disabled={busy} onClick={() => setShowExport(false)}>Cancel</Button>}
        <Button disabled={!canExecute} onClick={() => review ? void execute() : setReview(true)} className="bg-[#38BDF8] text-black hover:bg-[#7DD3FC]">
          {destination === 'download' ? <Download className="size-4" /> : <Send className="size-4" />}{busy ? 'Submitting…' : review ? 'Confirm export' : 'Review export'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
