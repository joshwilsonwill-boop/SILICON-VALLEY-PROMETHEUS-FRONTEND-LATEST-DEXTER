export function isGeminiCredentialFailure(code: unknown, status: unknown, message: unknown): boolean {
  const numericCode = typeof code === 'number' ? code : Number(code)
  const normalizedStatus = typeof status === 'string' ? status.toUpperCase() : ''
  const normalizedMessage = typeof message === 'string' ? message.toLowerCase() : ''
  return [401, 403, 429].includes(numericCode)
    || ['UNAUTHENTICATED', 'PERMISSION_DENIED', 'RESOURCE_EXHAUSTED'].includes(normalizedStatus)
    || /invalid api key|api key.*(invalid|revoked)|unauthorized|quota|resource exhausted/.test(normalizedMessage)
}
