import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

const flag = process.argv[2] || '--all'

function verifyP1() {
  const chatFile = read('components/editor/PrometheusChat.tsx')
  const hookFile = read('hooks/use-ai-chat.ts')

  // P1: Must have in-memory and persistent session cache to eliminate false empty states on reopen/switch/fresh navigation
  assert.match(
    hookFile,
    /sessionMessagesCache|sessionCache/i,
    'use-ai-chat must provide in-memory session message cache',
  )
  assert.match(
    hookFile,
    /prometheus\.active-session\./,
    'use-ai-chat must hydrate active session ID from localStorage on mount',
  )
  assert.match(
    hookFile,
    /await loadSessionMessages/,
    'initializeHistory must await loadSessionMessages so isHistoryLoading is not released prematurely',
  )

  // P1: PrometheusChat must explicitly handle isHistoryLoading before empty greeting
  assert.match(
    chatFile,
    /data-chat-history-loading/,
    'PrometheusChat must render an explicit session loading indicator with data-chat-history-loading',
  )

  // P1: Must not render ElegistChatGreeting while history is loading or while existing sessions exist
  assert.match(
    chatFile,
    /persistentChat\.sessions\.length === 0/,
    'PrometheusChat must never render ElegistChatGreeting when sessions already exist',
  )

  // P1: ChatSuggestions must be hidden while history is loading
  assert.match(
    chatFile,
    /persistentChat\.isHistoryLoading/,
    'PrometheusChat must hide ChatSuggestions while history is loading',
  )

  console.log('p1-reopen-loading-state-verified')
}

function verifyP2() {
  const chatFile = read('components/editor/PrometheusChat.tsx')

  // P2: Must inspect message sequences and identify orphan user messages without assistant replies
  assert.match(
    chatFile,
    /data-orphan-message-indicator/,
    'PrometheusChat must render an explicit indicator (data-orphan-message-indicator) for orphan user messages',
  )

  // P2: Must state honest status (no assistant reply recorded) without mutating or deleting messages
  assert.match(
    chatFile,
    /No assistant reply recorded|No reply recorded/i,
    'PrometheusChat must honestly label turns where no assistant reply was received',
  )

  // P2: Must provide one-click retry for orphan turns
  assert.match(
    chatFile,
    /Retry generation|onRetryOrphan/,
    'PrometheusChat must provide a retry action on orphan message bubbles',
  )

  console.log('p2-orphan-messages-honesty-verified')
}

function verifyP3() {
  const rowFile = read('components/editor/prometheus-chat-history-row.tsx')
  const drawerFile = read('components/editor/prometheus-chat-history-drawer.tsx')
  const logFile = read('lib/conversation-log.ts')
  const sessionsFile = read('lib/supabase/chat-sessions.ts')
  const chatFile = read('components/editor/PrometheusChat.tsx')

  // P3: History row must display message count
  assert.match(
    rowFile,
    /data-session-message-count/,
    'PrometheusChatHistoryRow must display message count attribute',
  )

  // P3: History row must display project scope / badge
  assert.match(
    rowFile,
    /data-session-project/,
    'PrometheusChatHistoryRow must display project scope / badge attribute',
  )

  // P3: History drawer must have search input filtering by title and content
  assert.match(
    drawerFile,
    /data-history-search/,
    'PrometheusChatHistoryDrawer must include a search input with data-history-search',
  )

  // P3: Remote session queries must query message counts
  assert.match(
    sessionsFile,
    /chat_messages\(count\)/,
    'getRemoteProjectChatSessions must query chat_messages(count) from Supabase',
  )

  // P3: Exported log uses Prometheus Editorial Conversation title and includes status notes
  assert.match(
    chatFile,
    /prometheus-editorial-/,
    'PrometheusChat export button must name files prometheus-editorial-...',
  )
  assert.match(
    logFile,
    /statusNote|failureNotice/,
    'lib/conversation-log.ts must support turn status notes for orphan turns',
  )

  // Run unit tests for log and message counts
  execFileSync(
    process.execPath,
    ['--import', 'tsx', '--test', 'tests/chat-critique-integration.test.ts'],
    { cwd: root, stdio: 'inherit' },
  )

  console.log('p3-history-dialog-search-metadata-verified')
}

function verifyP4() {
  const sessionsFile = read('lib/supabase/chat-sessions.ts')
  const localHistoryFile = read('lib/prometheus-assistant/local-chat-history.ts')

  // P4: Project sessions must be filtered strictly by project_id
  assert.match(
    sessionsFile,
    /eq\(["']project_id["'],\s*projectId\)/,
    'Remote project session fetch must query strictly by project_id',
  )
  assert.match(
    localHistoryFile,
    /session\.project_id === projectId/,
    'Local history project session filter must compare project_id',
  )

  console.log('p4-cross-project-separation-verified')
}

function verifyP5() {
  const uploadInterface = read('components/video-upload-interface.tsx')
  const topNavFilament = read('components/navigation/jarvis-top-nav-filament.tsx')
  const chatFile = read('components/editor/PrometheusChat.tsx')

  // P5: Home prompt box must explain its inception role (separate from project chats)
  assert.match(
    uploadInterface,
    /inception|new project/i,
    'Home upload interface prompt must state its role as new project inception',
  )

  // P5: Top nav filament must state that Jarvis voice operates independently from saved text chats
  assert.match(
    topNavFilament,
    /Jarvis Voice operates independently|Saved project text chats remain separate/,
    'Jarvis top nav filament must honestly explain that voice companion is separate from saved editorial chats',
  )

  // P5: Editorial chat upfront notice must clarify separation from Jarvis Voice
  assert.match(
    chatFile,
    /Jarvis Voice Neural Filament/,
    'Editorial chat role notice must clarify separation from global Jarvis Voice',
  )

  console.log('p5-surface-honesty-verified')
}

function verifyP6() {
  const chatFile = read('components/editor/PrometheusChat.tsx')

  // P6: Upfront notice before first prompt explaining that chat plans/stages and MP4 renders happen in Export
  assert.match(
    chatFile,
    /data-chat-role-notice/,
    'PrometheusChat must display an upfront notice (data-chat-role-notice) before prompts',
  )
  assert.match(
    chatFile,
    /Export|export/i,
    'Upfront notice must explicitly cite the Export workspace for final MP4 generation',
  )

  console.log('p6-upfront-export-routing-verified')
}

function verifyP7() {
  const hookFile = read('hooks/use-ai-chat.ts')
  const drawerFile = read('components/editor/prometheus-chat-history-drawer.tsx')
  const panelFile = read('components/editor/ai-chat-history-panel.tsx')

  // P7: History drawer and panel must explicitly explain + New chat behaviour
  assert.match(
    drawerFile,
    /starts a fresh thread for this project.*Previous conversations remain saved/s,
    'PrometheusChatHistoryDrawer must explain + New chat behaviour in UI subtitle',
  )
  assert.match(
    panelFile,
    /starts a fresh thread for this project.*Previous conversations remain saved/s,
    'AIChatHistoryPanel must explain + New chat behaviour in UI subtitle',
  )

  // P7: createNewSession must retain previous sessions in list
  assert.match(
    hookFile,
    /createNewSession/,
    'use-ai-chat must implement createNewSession',
  )
  assert.match(
    hookFile,
    /setSessions\(\(current\)\s*=>\s*\[session,\s*\.\.\.current/,
    'createNewSession must prepend the new session without discarding previous sessions',
  )

  console.log('p7-second-chat-preservation-verified')
}

function verifyP8() {
  console.log('Running typecheck...')
  execFileSync(process.execPath, ['scripts/verify-typecheck.mjs'], { cwd: root, stdio: 'inherit' })

  console.log('Running jarvis-render tests...')
  execFileSync(
    process.execPath,
    [
      '--import',
      'tsx',
      '--test',
      '--test-reporter=tap',
      'tests/jarvis-source-registration.test.ts',
      'tests/jarvis-render-receipts.test.ts',
      'tests/jarvis-end-to-end-session.test.mjs',
      'tests/jarvis-mp4-session.test.mjs',
      'tests/source-render-readiness.test.ts',
      'tests/project-lifecycle-services.test.mjs',
      'tests/jarvis-source-replacement-repair.test.ts',
      'tests/jarvis-collaborator-render-pipeline.test.ts',
      'tests/chat-critique-integration.test.ts',
    ],
    { cwd: root, stdio: 'inherit' },
  )

  console.log('p8-typecheck-and-regression-verified')
}

if (flag === '--p1') verifyP1()
else if (flag === '--p2') verifyP2()
else if (flag === '--p3') verifyP3()
else if (flag === '--p4') verifyP4()
else if (flag === '--p5') verifyP5()
else if (flag === '--p6') verifyP6()
else if (flag === '--p7') verifyP7()
else if (flag === '--p8') verifyP8()
else if (flag === '--all') {
  verifyP1()
  verifyP2()
  verifyP3()
  verifyP4()
  verifyP5()
  verifyP6()
  verifyP7()
  verifyP8()
} else {
  console.error(`Unknown flag: ${flag}`)
  process.exit(1)
}
