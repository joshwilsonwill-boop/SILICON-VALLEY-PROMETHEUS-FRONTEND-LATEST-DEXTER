import assert from 'node:assert/strict'

import {
  buildRealtimeAudioInput,
  buildRealtimeVideoInput,
} from '../lib/voice-companion/gemini-live-client'

assert.deepEqual(buildRealtimeAudioInput('pcm-base64'), {
  realtimeInput: {
    audio: {
      mimeType: 'audio/pcm;rate=16000',
      data: 'pcm-base64',
    },
  },
})

assert.deepEqual(buildRealtimeVideoInput('jpeg-base64'), {
  realtimeInput: {
    video: {
      mimeType: 'image/jpeg',
      data: 'jpeg-base64',
    },
  },
})
