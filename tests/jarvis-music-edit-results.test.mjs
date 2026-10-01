import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
const require = createRequire(import.meta.url)
const { performVoiceMusicAction } = require('../lib/voice-companion/music-controls.ts')
const { mergeCutRanges, planAdditionalCuts, cutTranscriptWord, cutTranscriptSegment, removeTimedFillerWords } = require('../lib/voice-companion/edit-results.ts')

const title = 'On the Night I Die'
const tracks = [{ id: 'wrong', title: 'On My Way' }, { id: 'exact', title, previewUrl: '/exact.mp3' }]
let calls = [], tab = 'Editor'
const handlers = {
  getMusicCatalog: () => tracks,
  getActiveWorkspaceTab: () => tab,
  onTabChange: async (next) => { tab = next; calls.push(`tab:${next}`) },
  onSelectMusicTrack: async (id) => { calls.push(`select:${id}`); return { success: true, summary: 'Staged', trackId: id } },
  onPlayMusicPreview: async (id) => { calls.push(`play:${id}`); return { success: true, summary: 'Started', trackId: id } },
}
const selected = await performVoiceMusicAction({ action: 'select', query: title }, () => handlers)
assert.equal(selected.success, true)
assert.equal(selected.trackId, 'exact')
assert.equal(selected.staged, true)
assert.equal(tab, 'Motion')
assert.deepEqual(calls, ['tab:Music', 'select:exact', 'tab:Motion'])
calls = []
const preview = await performVoiceMusicAction({ action: 'preview', trackName: title }, () => handlers)
assert.equal(preview.previewStarted, true)
assert.equal(preview.staged, false)
assert.deepEqual(calls, ['tab:Music', 'play:exact'])
calls = []
assert.equal((await performVoiceMusicAction({action:'select',query:'Unlisted Song'}, () => handlers)).success, false)
assert.deepEqual(calls, [])
assert.equal((await performVoiceMusicAction({action:'preview',query:title}, () => ({...handlers,onPlayMusicPreview:undefined}))).success, false)
assert.equal((await performVoiceMusicAction({action:'preview',query:title}, () => ({...handlers,onPlayMusicPreview:async()=>{throw new Error('NotAllowedError')}}))).success, false)
assert.equal((await performVoiceMusicAction({action:'select',query:title}, () => ({...handlers,onSelectMusicTrack:()=>undefined}))).success, false)
assert.equal((await performVoiceMusicAction({action:'select',trackId:'missing'}, () => handlers)).success, false)
const searched = []
const remote = await performVoiceMusicAction({action:'preview',query:title}, () => ({...handlers,getMusicCatalog:()=>[],searchMusicTracks:async(query)=>{searched.push(query);return tracks}}))
assert.equal(remote.trackId,'exact')
assert.deepEqual(searched,[title])
assert.equal((await performVoiceMusicAction({action:'select',query:title}, () => ({...handlers,getActiveWorkspaceTab:()=> 'Music'}))).success,false)

assert.deepEqual(mergeCutRanges([{start:1,end:2},{start:2.02,end:3},{start:1.5,end:2.5}]),[{start:1,end:3}])
// Distinct 20 ms of speech between cuts must never be silently removed.
assert.deepEqual(mergeCutRanges([{start:1,end:2},{start:2.02,end:3}]),[{start:1,end:2},{start:2.02,end:3}])
assert.deepEqual(planAdditionalCuts([{start:1,end:3}], [{start:2,end:4}]).ranges,[{start:3,end:4}])
assert.equal(planAdditionalCuts([{start:1,end:3}], [{start:1,end:3}]).totalRemovedSec,0)
const transcript=[{id:'s1',startMs:0,endMs:3000,text:'um I like it uh',words:[{text:'um',startMs:0,endMs:100},{text:'I',startMs:100,endMs:300},{text:'like',startMs:300,endMs:600},{text:'it',startMs:600,endMs:900},{text:'uh',startMs:1200,endMs:1400}]}]
const filler=removeTimedFillerWords(transcript)
assert.equal(filler.result.count,2)
assert.equal(filler.result.totalRemovedSec,.3)
assert.equal(filler.segments[0].words[2].isCut,undefined)
assert.equal(removeTimedFillerWords(filler.segments).result.count,0)
const cut=cutTranscriptWord(transcript,'s1',1)
assert.equal(cut.result.count,1)
assert.equal(cutTranscriptWord(cut.segments,'s1',1).result.count,0)
assert.equal(cutTranscriptWord([{id:'raw',text:'um',startMs:0,endMs:100}], 'raw',0).result.success,false)
assert.equal(cutTranscriptSegment(cutTranscriptSegment(transcript,'s1').segments,'s1').result.count,0)
assert.equal(removeTimedFillerWords([{id:'raw',text:'um',startMs:0,endMs:100}]).result.success,false)
const editor=readFileSync(new URL('../app/editor/[id]/page.tsx',import.meta.url),'utf8')
assert.match(editor,/onPlayMusicPreview:\s*handleVoiceMusicPreview/)
assert.match(editor,/onRemoveFillerWords:\s*handleVoiceRemoveFillers/)
assert.doesNotMatch(editor,/applyEditorActionDrafts\(drafts\.filter/)
const coordinator=readFileSync(new URL('../lib/autonomous-ui/coordinator.ts',import.meta.url),'utf8')
assert.doesNotMatch(coordinator,/cleanTokens\[0\]/)
console.log('jarvis-music-edit-results passed')
