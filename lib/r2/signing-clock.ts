const MATERIAL_CLOCK_SKEW_MS = 60_000

export function r2SigningClockOffset(serverDate: string | null, localNow = Date.now()) {
  if (!serverDate) return null

  const serverNow = Date.parse(serverDate)
  if (!Number.isFinite(serverNow)) return null

  const offset = serverNow - localNow
  return Math.abs(offset) >= MATERIAL_CLOCK_SKEW_MS ? offset : null
}
