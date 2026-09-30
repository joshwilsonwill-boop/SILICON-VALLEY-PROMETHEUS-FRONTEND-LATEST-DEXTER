const MAX_SNIPPET_CHARS = 420
const MAX_MATCHES_PER_TERM = 64
const IGNORED_QUERY_TERMS = new Set(['about', 'after', 'also', 'because', 'from', 'have', 'into', 'that', 'their', 'there', 'these', 'they', 'this', 'what', 'when', 'where', 'which', 'with', 'would', 'your', 'the'])

/** Return a few short, relevant transcript excerpts without sending the entire
 * transcript on every Live session setup or retaining it in model context. */
export function searchTranscriptText(transcript: string, query: string): string[] {
  const source = transcript.trim()
  const terms = Array.from(new Set(query.toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []))
    .filter((term) => !IGNORED_QUERY_TERMS.has(term))
    .slice(0, 12)
  if (!source || terms.length === 0) return []

  const normalized = source.toLocaleLowerCase()
  const positions: number[] = []
  for (const term of terms) {
    let from = 0
    let count = 0
    while (from < normalized.length) {
      const index = normalized.indexOf(term, from)
      if (index < 0) break
      count += 1
      from = index + term.length
    }

    const sampleEvery = Math.max(1, Math.ceil(count / MAX_MATCHES_PER_TERM))
    from = 0
    let matchIndex = 0
    while (from < normalized.length && matchIndex < count) {
      const index = normalized.indexOf(term, from)
      if (index < 0) break
      if (matchIndex % sampleEvery === 0) positions.push(index)
      matchIndex += 1
      from = index + term.length
    }
  }

  if (positions.length === 0) return []
  const centers = Array.from(new Set(positions)).sort((a, b) => a - b)
  const candidates = centers.map((center) => {
    const start = Math.max(0, center - Math.floor(MAX_SNIPPET_CHARS / 2))
    const end = Math.min(source.length, start + MAX_SNIPPET_CHARS)
    const snippet = source.slice(start, end).trim()
    const score = terms.reduce((total, term) => total + (snippet.toLocaleLowerCase().includes(term) ? 1 : 0), 0)
    return { snippet, score, center }
  })

  candidates.sort((a, b) => b.score - a.score || a.center - b.center)
  const selected: typeof candidates = []
  for (const candidate of candidates) {
    if (selected.every((item) => Math.abs(item.center - candidate.center) >= MAX_SNIPPET_CHARS / 2)) {
      selected.push(candidate)
      if (selected.length === 3) break
    }
  }

  return selected.map(({ snippet }) => snippet)
}
