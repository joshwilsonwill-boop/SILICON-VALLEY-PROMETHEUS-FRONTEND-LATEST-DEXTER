export async function requestProjectDeletion(id: string, request: typeof fetch = fetch) {
  const response = await request(`/api/projects/${encodeURIComponent(id)}`, { method: 'DELETE' })
  const payload = await response.json().catch(() => null) as { success?: boolean; error?: { message?: string } } | null
  if (!response.ok || !payload?.success) throw new Error(payload?.error?.message || 'Failed to delete project')
}
