import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const plan = readFileSync('docs/jarvis-latency-architecture.md', 'utf8')
const gaps = readFileSync('docs/jarvis-capability-gaps.md', 'utf8')

assert.match(plan, /full project transcript was included in both/)
assert.match(plan, /bounded eight-second deadline/)
assert.match(plan, /high RTT, packet loss, and short disconnects/)
assert.match(plan, /p95 time-to-first-audio/)
assert.match(gaps, /Established-session recovery and latency telemetry/)

console.log('jarvis-latency-plan: all assertions passed')
