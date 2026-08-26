import type { HermesMemoryEntry, HermesMemoryKind, HermesMemoryStore } from './memory'

/**
 * Supabase-backed Hermes memory store.
 *
 * `@/lib/supabase/server` is intentionally NOT imported here — the caller (the
 * API route) passes the already-created client in, so this module stays
 * import-safe for test harnesses. All reads/writes are best-effort: if the
 * `hermes_memory` table is missing the store degrades to an empty cache rather
 * than throwing.
 */

export interface HermesMemoryRow {
  id?: string
  user_id: string
  session_id: string
  text: string
  kind: string
  source_title?: string | null
  created_at?: string
  last_touched_at?: string
}

function rowToEntry(row: HermesMemoryRow): HermesMemoryEntry {
  return {
    id: row.id ?? `${row.user_id}:${row.created_at ?? Date.now()}`,
    userId: row.user_id,
    sessionId: row.session_id,
    text: row.text,
    kind: (row.kind as HermesMemoryKind) ?? 'fact',
    sourceTitle: row.source_title ?? undefined,
    createdAt: row.created_at ?? new Date(0).toISOString(),
    lastTouchedAt: row.last_touched_at ?? new Date(0).toISOString(),
  }
}

function entryToRow(userId: string, entry: HermesMemoryEntry): HermesMemoryRow {
  return {
    id: entry.id,
    user_id: userId,
    session_id: entry.sessionId,
    text: entry.text,
    kind: entry.kind,
    source_title: entry.sourceTitle ?? null,
    created_at: entry.createdAt,
    last_touched_at: entry.lastTouchedAt,
  }
}

export class SupabaseHermesMemoryStore implements HermesMemoryStore {
  // The Supabase client's generic `from()` return type is deeply instantiated
  // (SupabaseClient<any,…> triggers TS2589 when passed structurally), so we accept
  // the client through a loose seam. All operations are best-effort/try-catch, so
  // this is a safe tradeoff: we own the row shape via HermesMemoryRow above.
  constructor(private readonly db: {
    from: (table: string) => any
  }) {}

  async load(userId: string): Promise<HermesMemoryEntry[]> {
    try {
      const { data, error } = await this.db
        .from('hermes_memory')
        .select('*')
        .eq('user_id', userId)
        .order('last_touched_at', { ascending: false })
      if (error) return []
      return (data ?? []).map(rowToEntry)
    } catch {
      return []
    }
  }

  async save(userId: string, entries: HermesMemoryEntry[]): Promise<void> {
    try {
      const rows = entries.filter((entry) => entry.userId === userId).map((entry) => entryToRow(userId, entry))
      if (!rows.length) return
      await this.db.from('hermes_memory').upsert(rows, { onConflict: 'id' })
    } catch {
      // Best-effort: memory persistence must never break a turn.
    }
  }
}
