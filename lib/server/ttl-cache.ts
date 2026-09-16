import 'server-only'

type CacheEntry<T> = {
  value: T
  expiresAt: number
}

/**
 * Small in-process TTL cache with in-flight dedupe for expensive, per-key reads
 * (e.g. Supabase fan-outs or YouTube analytics syncs). Single-flight guarantees
 * concurrent requests for the same key share one upstream call instead of
 * stampeding it.
 */
export function createTtlCache<T>({ ttlMs, maxEntries = 200 }: { ttlMs: number; maxEntries?: number }) {
  const entries = new Map<string, CacheEntry<T>>()
  const inflight = new Map<string, Promise<T>>()

  function store(key: string, value: T) {
    if (entries.size >= maxEntries) {
      const oldestKey = entries.keys().next().value
      if (oldestKey !== undefined) entries.delete(oldestKey)
    }
    entries.set(key, { value, expiresAt: Date.now() + ttlMs })
  }

  return {
    get(key: string): T | undefined {
      const entry = entries.get(key)
      if (!entry) return undefined
      if (entry.expiresAt <= Date.now()) {
        entries.delete(key)
        return undefined
      }
      return entry.value
    },
    /** Returns the cached value if fresh, otherwise runs (and dedupes) the loader. */
    async resolve(key: string, loader: () => Promise<T>, isCacheable: (value: T) => boolean = () => true): Promise<T> {
      const cached = this.get(key)
      if (cached !== undefined) return cached

      const pending = inflight.get(key)
      if (pending) return pending

      const task = loader()
        .then((value) => {
          if (isCacheable(value)) store(key, value)
          return value
        })
        .finally(() => {
          inflight.delete(key)
        })

      inflight.set(key, task)
      return task
    },
    invalidate(key: string) {
      entries.delete(key)
    },
  }
}
