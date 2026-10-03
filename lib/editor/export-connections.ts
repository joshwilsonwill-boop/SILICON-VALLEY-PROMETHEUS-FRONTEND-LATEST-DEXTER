export type ExportConnection = {
  provider: string
  connected?: boolean | null
  expiresAt?: string | null
  status?: string | null
}

function isExportConnection(value: unknown): value is ExportConnection {
  return (
    typeof value === 'object' &&
    value !== null &&
    'provider' in value &&
    typeof value.provider === 'string'
  )
}

export function normalizeExportConnections(payload: unknown): ExportConnection[] {
  const candidate =
    typeof payload === 'object' && payload !== null && 'connections' in payload
      ? payload.connections
      : payload

  return Array.isArray(candidate) ? candidate.filter(isExportConnection) : []
}

export function isExportProviderConnected(
  connections: ExportConnection[],
  provider: string,
): boolean {
  return connections.some(
    (connection) => connection.provider === provider && connection.connected === true && connection.status !== 'disconnected' && connection.status !== 'expired' && (!connection.expiresAt || Date.parse(connection.expiresAt) > Date.now()),
  )
}
