export default function Loading() {
  return <div role="status" aria-live="polite" className="flex min-h-[60vh] items-center justify-center gap-3 bg-[var(--theme-background)] text-[var(--theme-foreground)]">
    <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-[var(--theme-accent)] motion-reduce:animate-none" />
    <span>Opening your workspace…</span>
  </div>
}
