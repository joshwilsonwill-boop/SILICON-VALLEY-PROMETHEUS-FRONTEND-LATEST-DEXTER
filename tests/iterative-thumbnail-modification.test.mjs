import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import { buildNanoBananaImageRequest } from '../lib/thumbnails/nano-banana-image.ts'
import { buildOpenAIImageEditRequest, buildOpenAIImageEditFormData } from '../lib/thumbnails/openai-image-edit.ts'
import { applyThumbnailIterationDirection } from '../lib/thumbnails/creative-direction.ts'

const frame = 'data:image/jpeg;base64,YW5jaG9y'
const baseThumbnail = 'data:image/png;base64,YmFzZXRodW1i'
const reference = 'data:image/png;base64,c3R5bGU='

test('G1: Iterative request builders and creative direction support base thumbnail anchoring and revision prompts', () => {
  // 1. Creative direction helper applies iteration instruction with character identity lock
  const basePrompt = 'Cinematic tech thumbnail with headline "AI EXPLOSION"'
  const iterationPrompt = 'Make the headline neon cyan and darken the background'
  const revisedPrompt = applyThumbnailIterationDirection(basePrompt, iterationPrompt)

  assert.match(revisedPrompt, /ITERATIVE REVISION REQUEST/)
  assert.match(revisedPrompt, /Make the headline neon cyan and darken the background/)
  assert.match(revisedPrompt, /subject pose, framing, and typography style intact/i)

  // 2. Gemini nano-banana request builder includes base thumbnail as primary base artwork anchor
  const geminiReq = buildNanoBananaImageRequest({
    prompt: revisedPrompt,
    frameDataUrl: frame,
    baseThumbnailUrl: baseThumbnail,
    referenceImages: [reference],
    aspectRatio: '16:9',
  })

  assert.equal(geminiReq.contents[0].parts[0].text.includes('iterative refinement of the existing thumbnail'), true)
  assert.equal(geminiReq.contents[0].parts.some(p => p.text?.includes('Current base thumbnail being iteratively refined:')), true)
  assert.deepEqual(geminiReq.contents[0].parts[4], { inline_data: { mime_type: 'image/png', data: 'YmFzZXRodW1i' } })
  assert.equal(geminiReq.contents[0].parts.some(p => p.text?.includes('Video frame and principal subject:')), true)

  // 3. OpenAI image edit builder sets base thumbnail as primary image
  const openaiReq = buildOpenAIImageEditRequest({
    prompt: revisedPrompt,
    frameDataUrl: frame,
    baseThumbnailUrl: baseThumbnail,
    referenceImages: [reference],
    aspectRatio: '16:9',
    quality: 'pro',
  })

  assert.deepEqual(openaiReq.images[0], { image_url: baseThumbnail })
  assert.match(openaiReq.prompt, /first attached image as the base thumbnail to edit iteratively/)
  assert.match(openaiReq.prompt, /Do not recreate the image from scratch/)

  // 4. OpenAI FormData builder uses base thumbnail as the primary image anchor
  const formData = buildOpenAIImageEditFormData({
    prompt: revisedPrompt,
    frameDataUrl: frame,
    baseThumbnailUrl: baseThumbnail,
    referenceImages: [reference],
    aspectRatio: '16:9',
    quality: 'pro',
  })
  assert.equal(formData.has('image[]'), true)
  assert.equal(formData.has('prompt'), true)

  console.log('G1_ITERATIVE_REQUEST_BUILDERS_PASSED')
})

test('G2: Nano Banana server route parses base thumbnail and iterative prompts to preserve visual features', () => {
  const routePath = path.resolve('app/api/projects/[id]/thumbnails/nano-banana/route.ts')
  const content = fs.readFileSync(routePath, 'utf8')

  // Verifies request interface supports iterative fields
  assert.match(content, /baseThumbnailUrl\?: string/)
  assert.match(content, /iterationPrompt\?: string/)

  // Verifies extraction and application of iterationPrompt and baseThumbnailUrl
  assert.match(content, /applyThumbnailIterationDirection\(synthesizedPrompt, iterationPrompt\)/)
  assert.match(content, /baseThumbnailUrl,\s*referenceImages/s)
  assert.match(content, /buildOpenAIImageEditFormData\(\{[\s\S]*baseThumbnailUrl/)
  assert.match(content, /buildNanoBananaImageRequest\(\{[\s\S]*baseThumbnailUrl/)

  console.log('G2_SERVER_ROUTE_ITERATION_PASSED')
})

test('G3: ThumbnailStudioModal preserves generated artwork across updates and passes active thumbnail as iteration base', () => {
  const modalPath = path.resolve('components/editor/ThumbnailStudioModal.tsx')
  const content = fs.readFileSync(modalPath, 'utf8')

  // Verifies jarvisDraft interface accepts iterative instructions
  assert.match(content, /isIterative\?: boolean/)
  assert.match(content, /iterationPrompt\?: string/)
  assert.match(content, /baseThumbnailUrl\?: string/)

  // Verifies chatMessages state and handler are initialized
  assert.match(content, /chatMessages.*setChatMessages/)
  assert.match(content, /handleIterateThumbnail/)

  // Verifies generatedDataUrl is preserved across parameter adjustments rather than wiped out
  assert.doesNotMatch(content, /if \(generatedSignatureRef\.current !== requestSignature\) \{\s*setGeneratedDataUrl\(null\)/)

  // Verifies request body passes baseThumbnailUrl and iterationPrompt to nano-banana API
  assert.match(content, /baseThumbnailUrl/)
  assert.match(content, /iterationPrompt: effectiveIterativePrompt/)

  console.log('G3_STUDIO_MODAL_PRESERVATION_PASSED')
})

test('G4: ThumbnailWorkspace provides an interactive Chat Assistant tab with conversational revisions and quick prompt chips', () => {
  const workspacePath = path.resolve('components/editor/thumbnail-studio/ThumbnailWorkspace.tsx')
  const content = fs.readFileSync(workspacePath, 'utf8')

  // Verifies export of ThumbnailChatMessage and inclusion in props
  assert.match(content, /export type ThumbnailChatMessage/)
  assert.match(content, /chatMessages\?: ThumbnailChatMessage\[\]/)
  assert.match(content, /onIterateThumbnail\?: \(prompt: string\) => void/)

  // Verifies Chat tab navigation
  assert.match(content, /\{ id: 'chat', label: 'Chat', icon: MessageSquare \}/)

  // Verifies Chat panel UI elements
  assert.match(content, /chatContextCard/)
  assert.match(content, /chatMessageList/)
  assert.match(content, /chatBubbleUser/)
  assert.match(content, /chatBubbleAssistant/)
  assert.match(content, /chatPromptChips/)
  assert.match(content, /chatInputBox/)
  assert.match(content, /chatSendBtn/)
  assert.match(content, /refineChatButton/)

  // Verifies CSS module contains styling for all chat classes
  const cssPath = path.resolve('components/editor/thumbnail-studio/ThumbnailWorkspace.module.css')
  const cssContent = fs.readFileSync(cssPath, 'utf8')
  assert.match(cssContent, /\.chatContainer/)
  assert.match(cssContent, /\.chatContextCard/)
  assert.match(cssContent, /\.chatMessageList/)
  assert.match(cssContent, /\.chatBubbleUser/)
  assert.match(cssContent, /\.chatBubbleAssistant/)
  assert.match(cssContent, /\.chatPromptChips/)
  assert.match(cssContent, /\.chatInputBox/)
  assert.match(cssContent, /\.chatSendBtn/)
  assert.match(cssContent, /\.refineChatButton/)

  console.log('G4_WORKSPACE_CHAT_UI_PASSED')
})

test('G5: Jarvis Voice Companion exposes modify_video_thumbnail, reports thumbnail state in get_editor_state, and handles iterative revisions', () => {
  // 1. Gemini Live client tool registry and instructions
  const geminiPath = path.resolve('lib/voice-companion/gemini-live-client.ts')
  const geminiContent = fs.readFileSync(geminiPath, 'utf8')
  assert.match(geminiContent, /name: 'modify_video_thumbnail'/)
  assert.match(geminiContent, /changes: \{ type: 'string'/)
  assert.match(geminiContent, /modify_video_thumbnail[\s\S]*recreate the thumbnail from scratch/i)

  // 2. Editor state reporter in voice companion hook
  const hookPath = path.resolve('hooks/use-voice-companion.ts')
  const hookContent = fs.readFileSync(hookPath, 'utf8')
  assert.match(hookContent, /hasThumbnail: Boolean\(bridge\.activeThumbnailUrl/)
  assert.match(hookContent, /thumbnailUrl: bridge\.activeThumbnailUrl/)
  assert.match(hookContent, /activeThumbnailHeadline: bridge\.activeThumbnailHeadline/)
  assert.match(hookContent, /case 'modify_video_thumbnail':/)
  assert.match(hookContent, /isIterative: true/)

  // 3. Editor action draft support
  const actionsPath = path.resolve('lib/editor-actions.ts')
  const actionsContent = fs.readFileSync(actionsPath, 'utf8')
  assert.match(actionsContent, /isIterative\?: boolean/)
  assert.match(actionsContent, /iterationPrompt\?: string/)
  assert.match(actionsContent, /baseThumbnailUrl\?: string/)

  // 4. Editor page bridge registration
  const editorPath = path.resolve('app/editor/[id]/page.tsx')
  const editorContent = fs.readFileSync(editorPath, 'utf8')
  assert.match(editorContent, /activeThumbnailUrl: project\?\.thumbnailUrl/)
  assert.match(editorContent, /isIterative: draft\.isIterative/)

  console.log('G5_JARVIS_VOICE_ITERATION_PASSED')
})
