import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { parseReferenceAnalysis, normalizeReferenceUrl, mapReferenceStyle, referencePreviewAt } = require('../lib/editor/reference-style.ts')
const { performVoiceReferenceStyleAction, applyReferenceStyleToController } = require('../lib/voice-companion/reference-controls.ts')
const { applyEditorialTimelinePatch, emptyEditorialTimeline, readEditorialTimeline, editorialTimelinePatchSchema } = require('../lib/editor/editorial-timeline-state.ts')

const fixture = {
  style_reference: 'Warm documentary with subtle pushes and clear captions.',
  editing_breakdown: 'Slow pushes emphasize key ideas; warm grading and restrained lower thirds support the speaker.',
  reference_duration_sec: 20,
  treatment: 'warm', caption_style: 'lower_third',
  zooms: [{ start_sec: 2, end_sec: 5, scale: 1.12, kind: 'smooth' }],
  observations: [{ time_sec: 2, detail: 'A subtle push begins on the speaker.' }],
  limitations: ['B-roll and transitions require additional source assets.'],
}
assert.equal(normalizeReferenceUrl('https://youtu.be/abcdef12345?t=2'), 'https://www.youtube.com/watch?v=abcdef12345')
for (const url of ['https://youtube.com.evil.test/watch?v=abcdef12345','https://vimeo.com/123', 'https://youtube.com/', 'http://localhost/test']) assert.throws(() => normalizeReferenceUrl(url))
const analysis = parseReferenceAnalysis(JSON.stringify(fixture))
assert.ok(analysis)
assert.equal(parseReferenceAnalysis(JSON.stringify({ ...fixture, observations: [] })), null, 'ungrounded prose cannot become a plan')
assert.equal(parseReferenceAnalysis(JSON.stringify({ ...fixture, zooms: [{start_sec: 5,end_sec: 2,scale:9,kind:'smooth'}] })), null)
const style = mapReferenceStyle(analysis, 'https://youtu.be/abcdef12345', 40)
assert.equal(style.zooms[0].start,4)
assert.equal(style.zooms[0].end,10)
assert.equal(referencePreviewAt(style,7).scale,1.06)
assert.equal(referencePreviewAt(style,15).scale,1)
assert.equal(referencePreviewAt(style,7).filter,'sepia(.15) saturate(1.12) contrast(1.04)')
assert.throws(()=>mapReferenceStyle(analysis,'https://youtu.be/abcdef12345',0))
assert.equal(editorialTimelinePatchSchema.safeParse({type:'reference_style',style}).success,true)
let timeline = applyEditorialTimelinePatch(emptyEditorialTimeline('source-1'),{type:'reference_style',style})
assert.deepEqual(readEditorialTimeline({editorialTimeline:timeline},'source-1').referenceStyle,style)
assert.equal(readEditorialTimeline({editorialTimeline:timeline},'replacement').referenceStyle,undefined)
let patches = 0
const controller = {
 getSnapshot: ()=>({timeline,status:'saved',error:null}),
 patch: p=>{patches++; timeline=applyEditorialTimelinePatch(timeline,p)},
}
const applied=await applyReferenceStyleToController(controller,style)
assert.equal(applied.success,true)
assert.equal(patches,1)
const failed = await applyReferenceStyleToController({...controller,getSnapshot:()=>({timeline:null,status:'loading',error:null})},style)
assert.equal(failed.success,false)
let appliedCount=0; let tab='Editor'
const handlers={hasVideo:true,videoDurationSec:40,onTabChange: t=>{tab=t},contextProvider:()=>({workspaceTab:tab,durationSec:40}),onApplyReferenceStyle:async received=>{assert.equal(received.treatment,'warm');appliedCount++;return {success:true,summary:'Applied to preview'}}}
const fetcher=async ()=>({ok:true,json:async()=>({analysis,videoUrl:'https://www.youtube.com/watch?v=abcdef12345'})})
const result=await performVoiceReferenceStyleAction({url:'https://youtu.be/abcdef12345',apply:true},()=>handlers,fetcher)
assert.equal(result.success,true);assert.equal(appliedCount,1);assert.equal(tab,'Motion')
assert.match(result.summary,/preview/i)
const unavailable=await performVoiceReferenceStyleAction({url:'https://youtu.be/abcdef12345',apply:true},()=>({...handlers,onApplyReferenceStyle:undefined}),fetcher)
assert.equal(unavailable.success,false)
const network=await performVoiceReferenceStyleAction({url:'https://youtu.be/abcdef12345'},()=>handlers,async()=>{throw Error('Network offline')})
assert.equal(network.success,false);assert.match(network.summary,/offline/)
const noSwitch=await performVoiceReferenceStyleAction({url:'https://youtu.be/abcdef12345',apply:true},()=>({...handlers,onTabChange:()=>{},contextProvider:()=>({workspaceTab:'Editor'})}),fetcher)
assert.equal(noSwitch.success,false);assert.equal(appliedCount,1)
console.log('jarvis-reference-workflow passed')
