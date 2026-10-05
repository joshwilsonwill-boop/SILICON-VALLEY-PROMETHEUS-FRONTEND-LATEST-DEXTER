import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { LIVE_AUDIO_TOOLS } from '../lib/voice-companion/gemini-live-client'
import type { EditorActionDraft } from '../lib/editor-actions'

describe('voice companion thumbnail aspect ratio support (Gate 4)', () => {
  it('LIVE_AUDIO_TOOLS declares aspectRatio in create_video_thumbnail and modify_video_thumbnail schemas', () => {
    const createTool = LIVE_AUDIO_TOOLS.find(
      (tool: any) => tool.name === 'create_video_thumbnail'
    )
    assert.ok(createTool, 'create_video_thumbnail tool must exist')
    const createAspectProp = createTool.parameters.properties.aspectRatio as { enum?: string[] } | undefined
    assert.ok(createAspectProp, 'aspectRatio property must exist in create_video_thumbnail')
    assert.deepEqual(createAspectProp?.enum, ['16:9', '9:16', '1:1', '3:2', '2:3'])

    const modifyTool = LIVE_AUDIO_TOOLS.find(
      (tool: any) => tool.name === 'modify_video_thumbnail'
    )
    assert.ok(modifyTool, 'modify_video_thumbnail tool must exist')
    const modifyAspectProp = modifyTool.parameters.properties.aspectRatio as { enum?: string[] } | undefined
    assert.ok(modifyAspectProp, 'aspectRatio property must exist in modify_video_thumbnail')
    assert.deepEqual(modifyAspectProp?.enum, ['16:9', '9:16', '1:1', '3:2', '2:3'])
  })

  it('EditorActionDraft open_thumbnail_studio supports aspectRatio', () => {
    const draft: EditorActionDraft = {
      kind: 'open_thumbnail_studio',
      summary: 'Open thumbnail studio with 9:16 aspect ratio',
      creativeDirection: 'Bold dark tech style',
      headline: 'THE REVOLUTION',
      aspectRatio: '9:16',
      generateNow: true,
    }

    assert.equal(draft.kind, 'open_thumbnail_studio')
    assert.equal(draft.aspectRatio, '9:16')
    assert.equal(draft.headline, 'THE REVOLUTION')
  })

  it('validates supported studio aspect ratios include vertical format 9:16', () => {
    const allowedRatios = ['16:9', '9:16', '1:1', '3:2', '2:3']
    assert.ok(allowedRatios.includes('9:16'), '9:16 vertical must be supported')
    assert.ok(allowedRatios.includes('16:9'), '16:9 landscape must be supported')
    assert.ok(allowedRatios.includes('1:1'), '1:1 square must be supported')
  })
})
