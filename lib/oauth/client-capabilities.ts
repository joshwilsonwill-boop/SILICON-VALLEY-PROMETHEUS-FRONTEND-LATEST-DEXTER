'use client'
import * as React from 'react'
export function useConfiguredProviders() {
  const [providers, setProviders] = React.useState<string[]>([])
  React.useEffect(() => {
    let active = true
    fetch('/api/oauth/capabilities', { cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('Integration status unavailable')
      const payload = await response.json()
      if (active) setProviders(Array.isArray(payload.providers) ? payload.providers : [])
    }).catch(() => { if (active) setProviders([]) })
    return () => { active = false }
  }, [])
  return providers
}
