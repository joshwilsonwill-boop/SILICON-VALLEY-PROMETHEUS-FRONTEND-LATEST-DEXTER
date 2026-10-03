import { PROVIDER_CONFIGS } from './providers'

export const PRODUCTION_ORIGIN = 'https://prometheusstudio.tech'
export function trustedOAuthOrigin(env: NodeJS.ProcessEnv = process.env) {
  // Never route authorization codes through request hosts or preview/Codespaces URLs.
  if (env.NODE_ENV === 'production') return PRODUCTION_ORIGIN
  const candidate = env.OAUTH_APP_ORIGIN?.trim()
  if (candidate) {
    const url = new URL(candidate)
    if (url.origin === PRODUCTION_ORIGIN || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return url.origin
  }
  return PRODUCTION_ORIGIN
}
export function providerCredentials(provider: string, env: NodeJS.ProcessEnv = process.env) {
  const config = PROVIDER_CONFIGS[provider]
  if (!config) return null
  const clientId = env[config.clientIdEnvVar ?? `${provider.toUpperCase()}_CLIENT_ID`]?.trim()
  const secretName = provider === 'google_drive' ? 'GOOGLE_CLIENT_SECRET' : provider === 'instagram' ? 'FACEBOOK_CLIENT_SECRET' : `${provider.toUpperCase()}_CLIENT_SECRET`
  const clientSecret = env[secretName]?.trim()
  return clientId && clientSecret ? { clientId, clientSecret } : null
}
export function configuredOAuthProviders(env: NodeJS.ProcessEnv = process.env) {
  // Explicit opt-in records that the external developer app was registered/tested.
  const enabled = new Set((env.OAUTH_ENABLED_PROVIDERS ?? '').split(',').map(value => value.trim()))
  return Object.keys(PROVIDER_CONFIGS).filter(provider => enabled.has(provider) && providerCredentials(provider, env))
}
