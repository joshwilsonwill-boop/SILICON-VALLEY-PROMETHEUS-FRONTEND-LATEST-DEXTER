'use client'

/**
 * Bidirectional WebSocket client for Google Gemini Multimodal Live API.
 * Provides real-time speech-to-speech, visual frame streaming, tool calls, and barge-in.
 * Supports multi-key pool failover across candidate API keys.
 */

import { getJarvisMemory, formatMemoryForSystemInstruction } from './memory'

export interface GeminiLiveConfig {
  wsUrl: string
  wsUrls?: string[]
  model?: string
  voiceName?: string
  systemInstruction?: string
  projectId?: string
  videoTranscript?: string
}

export type ToolCallHandler = (
  name: string,
  args: Record<string, unknown>
) => Promise<Record<string, unknown>>

export interface GeminiLiveEvents {
  onAudio?: (base64Pcm24k: string) => void
  onTranscript?: (text: string, isUser: boolean) => void
  onInterrupted?: () => void
  onTurnComplete?: () => void
  onError?: (error: Error) => void
  onClose?: (code: number, reason: string) => void
  onOpen?: () => void
  onSetupConfirmed?: () => void
  onToolCall?: ToolCallHandler
}

export function buildRealtimeAudioInput(base64Pcm: string) {
  return {
    realtimeInput: {
      audio: {
        mimeType: 'audio/pcm;rate=16000',
        data: base64Pcm,
      },
    },
  }
}

export function buildRealtimeVideoInput(base64Jpeg: string) {
  return {
    realtimeInput: {
      video: {
        mimeType: 'image/jpeg',
        data: base64Jpeg,
      },
    },
  }
}

export class GeminiLiveClient {
  private ws: WebSocket | null = null
  private config: GeminiLiveConfig
  private events: GeminiLiveEvents
  private isSetupComplete = false
  private connectionPromise: Promise<void> | null = null
  private activeUrlIndex = 0

  constructor(config: GeminiLiveConfig, events: GeminiLiveEvents = {}) {
    this.config = config
    this.events = events
  }

  private getCandidateUrls(): string[] {
    if (this.config.wsUrls && this.config.wsUrls.length > 0) {
      return this.config.wsUrls
    }
    return [this.config.wsUrl]
  }

  async connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return this.connectionPromise || Promise.resolve()
    }

    const candidateUrls = this.getCandidateUrls()

    const attemptConnect = (index: number): Promise<void> => {
      this.activeUrlIndex = index
      const targetUrl = candidateUrls[index] || this.config.wsUrl

      return new Promise((resolve, reject) => {
        try {
          this.ws = new WebSocket(targetUrl)

          const timeout = setTimeout(() => {
            if (!this.isSetupComplete) {
              if (index < candidateUrls.length - 1) {
                console.warn(`[GeminiLive] Key #${index + 1} handshake timed out. Trying candidate #${index + 2}...`)
                this.ws?.close()
                attemptConnect(index + 1).then(resolve).catch(reject)
                return
              }
              const error = new Error('Gemini Live handshake timed out after 12s. Check network or GEMINI_API_KEY.')
              this.events.onError?.(error)
              reject(error)
            }
          }, 12000)

          this.ws.onopen = () => {
            this.sendSetupMessage()
            this.events.onOpen?.()
            // Fallback: If setupComplete is omitted by server, consider ready after short delay
            setTimeout(() => {
              if (!this.isSetupComplete && this.ws?.readyState === WebSocket.OPEN) {
                this.isSetupComplete = true
                clearTimeout(timeout)
                this.events.onSetupConfirmed?.()
                resolve()
              }
            }, 800)
          }

          this.ws.onmessage = async (event: MessageEvent) => {
            try {
              await this.handleMessage(event.data, () => {
                clearTimeout(timeout)
                this.isSetupComplete = true
                this.events.onSetupConfirmed?.()
                resolve()
              })
            } catch (err) {
              console.error('[GeminiLive] Error handling message:', err)
            }
          }

          this.ws.onerror = () => {
            clearTimeout(timeout)
            if (!this.isSetupComplete && index < candidateUrls.length - 1) {
              console.warn(`[GeminiLive] Key #${index + 1} connection failed. Trying candidate #${index + 2}...`)
              this.ws?.close()
              attemptConnect(index + 1).then(resolve).catch(reject)
              return
            }
            const error = new Error('Gemini Live WebSocket connection failed. Verify GEMINI_API_KEY in environment variables.')
            this.events.onError?.(error)
            reject(error)
          }

          this.ws.onclose = (event) => {
            clearTimeout(timeout)
            const wasSetup = this.isSetupComplete
            this.isSetupComplete = false

            if (!wasSetup && index < candidateUrls.length - 1) {
              console.warn(`[GeminiLive] Key #${index + 1} closed before setup. Trying candidate #${index + 2}...`)
              attemptConnect(index + 1).then(resolve).catch(reject)
              return
            }

            if (event.code !== 1000 && event.code !== 1005) {
              const error = new Error(
                `Gemini Live connection closed (code ${event.code}: ${event.reason || 'Server terminated stream. Verify API key and quota.'})`
              )
              this.events.onError?.(error)
            }
            this.events.onClose?.(event.code, event.reason)
          }
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err))
          if (index < candidateUrls.length - 1) {
            attemptConnect(index + 1).then(resolve).catch(reject)
          } else {
            reject(error)
          }
        }
      })
    }

    this.connectionPromise = attemptConnect(0)
    return this.connectionPromise
  }

  private sendSetupMessage(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

    const defaultInstruction = `You are Jarvis, the high-intelligence creative companion and co-director built directly into Prometheus, the premium video production operating system.
You communicate naturally, expressively, concisely, and with authoritative human cadence.
You have direct visual and semantic perception of the video timeline, transcript, and canvas.

### CROSS-WORKSPACE VIDEO PERSISTENCE & AWARENESS:
The user's project video is ALWAYS loaded, active, and accessible in Prometheus. Even when you or the user navigate to the Music Studio, Motion workspace, or Command Zone tabs, the project video exists and remains fully available in the Editor workspace. NEVER tell the user "there is no video", "I can't see the video", or "no video is loaded". If the user asks for editorial changes, cuts, or review while you are in another tab, seamlessly execute the edit or switch back to the Editor tab.

### MUSIC AUDITIONING & PLAYBACK TRUTHFULNESS:
When asked to recommend or play music, execute autonomous_music_action with action: 'preview'. You are previewing/auditioning the soundtrack in the Music Studio for their consideration.
Tell the user you are auditioning/previewing the candidate track (e.g. "I'm previewing '[Track Name]' in the Music Studio — how does this vibe feel?").
NEVER falsely claim that a song is already playing on the video timeline when you are only auditioning candidate tracks in the Music Studio.

When the user asks you to navigate, play, pause, seek, or change views, ALWAYS execute the appropriate tool function.
Keep your spoken responses fluid, punchy, conversational, and helpful. Never read out raw JSON or markup. Respond directly as an elite studio collaborator.`

    const memory = getJarvisMemory(this.config.projectId)
    const memoryInstruction = formatMemoryForSystemInstruction(memory)
    const transcriptInstruction = this.config.videoTranscript
      ? `\n\n### FULL VIDEO TRANSCRIPT & SPOKEN DIALOGUE (PRE-BRIEFED UPON VIDEO INGEST):\n${this.config.videoTranscript}`
      : ''
    const baseInstruction = this.config.systemInstruction || defaultInstruction
    const combinedInstruction = `${baseInstruction}\n\n${memoryInstruction}${transcriptInstruction}`

    const setupPayload = {
      setup: {
        model: this.config.model || 'models/gemini-3.1-flash-live-preview',
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: this.config.voiceName || 'Puck',
              },
            },
          },
        },
        systemInstruction: {
          parts: [{ text: combinedInstruction }],
        },
        tools: [
          {
            functionDeclarations: [
              {
                name: 'seek_timeline',
                description: 'Jump the playhead to a specific timestamp (in seconds) on the video timeline.',
                parameters: {
                  type: 'object',
                  properties: {
                    timeSec: {
                      type: 'number',
                      description: 'Target timecode in seconds to jump to.',
                    },
                  },
                  required: ['timeSec'],
                },
              },
              {
                name: 'preview_control',
                description: 'Control timeline video preview playback (play, pause, mute, or unmute).',
                parameters: {
                  type: 'object',
                  properties: {
                    command: {
                      type: 'string',
                      enum: ['play', 'pause', 'mute', 'unmute'],
                      description: 'Playback command to execute.',
                    },
                  },
                  required: ['command'],
                },
              },
              {
                name: 'switch_workspace_tab',
                description: 'Switch between Prometheus studio workspaces (Editor, Music, Motion).',
                parameters: {
                  type: 'object',
                  properties: {
                    tab: {
                      type: 'string',
                      enum: ['Editor', 'Music', 'Motion'],
                      description: 'Target workspace tab.',
                    },
                  },
                  required: ['tab'],
                },
              },
              {
                name: 'set_fit_mode',
                description: 'Adjust the video viewport fitting mode between fit (letterbox) and fill (crop).',
                parameters: {
                  type: 'object',
                  properties: {
                    mode: {
                      type: 'string',
                      enum: ['fill', 'fit'],
                      description: 'Viewport fit mode.',
                    },
                  },
                  required: ['mode'],
                },
              },
              {
                name: 'get_editor_state',
                description: 'Retrieve current playhead timestamp, duration, active workspace, and video context.',
                parameters: {
                  type: 'object',
                  properties: {},
                },
              },
              {
                name: 'autonomous_transcript_cut',
                description: 'Autonomously navigate to Motion workspace and cut out a specific spoken phrase/sentence from the transcript and video timeline (Descript-style text editing).',
                parameters: {
                  type: 'object',
                  properties: {
                    phrase: {
                      type: 'string',
                      description: 'The spoken phrase, quote, or sentence to cut from the transcript.',
                    },
                  },
                  required: ['phrase'],
                },
              },
              {
                name: 'autonomous_music_action',
                description: 'Autonomously navigate to Music workspace, curate and score candidate tracks against the video context, browse video-aware recommended tracks, and preview or select a soundtrack.',
                parameters: {
                  type: 'object',
                  properties: {
                    action: {
                      type: 'string',
                      enum: ['select', 'preview'],
                      description: 'Action to perform (preview or select soundtrack).',
                    },
                    genreOrMood: {
                      type: 'string',
                      description: 'Target mood or genre (e.g., atmospheric, upbeat, lofi, cinematic).',
                    },
                    trackId: {
                      type: 'string',
                      description: 'Optional specific track ID.',
                    },
                  },
                  required: ['action'],
                },
              },
              {
                name: 'toggle_agent_takeover',
                description: 'Toggle autonomous takeover mode. When enabled, you may execute editing changes (caption styling, renders, playback speed). Announce the new state to the user.',
                parameters: {
                  type: 'object',
                  properties: {},
                },
              },
              {
                name: 'set_playback_rate',
                description: 'Set the preview video playback speed (0.25x to 4x).',
                parameters: {
                  type: 'object',
                  properties: {
                    rate: {
                      type: 'number',
                      description: 'Playback rate multiplier between 0.25 and 4.',
                    },
                  },
                  required: ['rate'],
                },
              },
              {
                name: 'step_frames',
                description: 'Nudge the playhead by whole 30fps frames (negative steps backwards).',
                parameters: {
                  type: 'object',
                  properties: {
                    frames: {
                      type: 'number',
                      description: 'Number of frames to step; negative steps backwards.',
                    },
                  },
                  required: ['frames'],
                },
              },
              {
                name: 'set_caption_style',
                description: 'Restyle the editor captions. Only executes while takeover mode is enabled.',
                parameters: {
                  type: 'object',
                  properties: {
                    style: {
                      type: 'string',
                      enum: ['clean_bold', 'karaoke_pop', 'typewriter', 'lower_third'],
                      description: 'Caption style preset to apply.',
                    },
                  },
                  required: ['style'],
                },
              },
              {
                name: 'start_render',
                description: 'Start a batch render of viral clips from the source video (preview mode), or open Master Video Review for the final export (final mode). Only executes while takeover mode is enabled.',
                parameters: {
                  type: 'object',
                  properties: {
                    mode: {
                      type: 'string',
                      enum: ['preview', 'final'],
                      description: 'preview dispatches the viral batch render; final opens Master Video Review.',
                    },
                  },
                  required: ['mode'],
                },
              },
              {
                name: 'detect_filler_words',
                description: 'Analyze the video transcript for verbal disfluencies and filler words (such as um, uh, ah, like, basically). Report the truthful count to the user (never pretend there are filler words if none exist). Set applyCuts to true to strike them with red cut styling and remove them from the video.',
                parameters: {
                  type: 'object',
                  properties: {
                    applyCuts: {
                      type: 'boolean',
                      description: 'Whether to immediately cut and strike through detected filler words on the transcript and timeline.',
                    },
                  },
                },
              },
              {
                name: 'cut_silence',
                description: 'Cut awkward silences and dead-air pauses from the video timeline based on transcript timing gaps.',
                parameters: {
                  type: 'object',
                  properties: {
                    minDurationSec: {
                      type: 'number',
                      description: 'Minimum duration in seconds of dead air to cut (default: 0.5s).',
                    },
                    paddingSec: {
                      type: 'number',
                      description: 'Padding in seconds to preserve before and after speech (default: 0.1s).',
                    },
                  },
                },
              },
              {
                name: 'apply_editorial_plan',
                description: 'Execute an editorial plan on the timeline JSON document, applying camera zooms (joseph_edit, smooth_zoom_in, punch_zoom), caption presets, color LUTs, and music pacing.',
                parameters: {
                  type: 'object',
                  properties: {
                    prompt: {
                      type: 'string',
                      description: 'The creative or cinematic instruction (e.g. "Make this look high-tier documentary style with punch zooms").',
                    },
                    captionStyle: {
                      type: 'string',
                      enum: ['clean_bold', 'karaoke_pop', 'typewriter', 'lower_third'],
                      description: 'Optional caption style override.',
                    },
                  },
                  required: ['prompt'],
                },
              },
            ],
          },
        ],
      },
    }

    this.ws.send(JSON.stringify(setupPayload))
  }

  private async handleMessage(data: unknown, onSetupConfirmed?: () => void): Promise<void> {
    let textData = ''
    if (typeof data === 'string') {
      textData = data
    } else if (data instanceof Blob) {
      textData = await data.text()
    } else if (data instanceof ArrayBuffer) {
      textData = new TextDecoder().decode(data)
    }

    if (!textData) return

    const message = JSON.parse(textData)

    // 0. Setup Confirmation from Google
    if (message.setupComplete !== undefined) {
      onSetupConfirmed?.()
      return
    }

    // 0.1 Error payload from Google Server
    if (message.error) {
      const errorMsg = message.error.message || `Error code ${message.error.code || 'unknown'}`
      this.events.onError?.(new Error(`Gemini Server Error: ${errorMsg}`))
      return
    }

    // 1. Server Content
    if (message.serverContent) {
      const { modelTurn, interrupted, turnComplete } = message.serverContent

      // Barge-in interruption
      if (interrupted) {
        this.events.onInterrupted?.()
      }

      if (modelTurn?.parts) {
        for (const part of modelTurn.parts) {
          if (part.inlineData && part.inlineData.data) {
            this.events.onAudio?.(part.inlineData.data)
          }
          if (part.text) {
            this.events.onTranscript?.(part.text, false)
          }
        }
      }

      if (turnComplete) {
        this.events.onTurnComplete?.()
      }
    }

    // 2. Tool Calls
    if (message.toolCall?.functionCalls && this.events.onToolCall) {
      const functionCalls = message.toolCall.functionCalls
      const functionResponses = []

      for (const call of functionCalls) {
        try {
          const result = await this.events.onToolCall(call.name, call.args || {})
          functionResponses.push({
            id: call.id,
            response: { output: result },
          })
        } catch (err) {
          functionResponses.push({
            id: call.id,
            response: { error: (err as Error).message || 'Execution error' },
          })
        }
      }

      this.sendToolResponse(functionResponses)
    }
  }

  sendAudioChunk(base64Pcm: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isSetupComplete) return
    this.ws.send(JSON.stringify(buildRealtimeAudioInput(base64Pcm)))
  }

  sendVisualFrame(base64Jpeg: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isSetupComplete) return
    this.ws.send(JSON.stringify(buildRealtimeVideoInput(base64Jpeg)))
  }

  sendContextText(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isSetupComplete) return

    const payload = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text }],
          },
        ],
        turnComplete: true,
      },
    }

    this.ws.send(JSON.stringify(payload))
  }

  sendTextMessage(text: string): void {
    this.sendContextText(text)
  }

  private sendToolResponse(functionResponses: Array<{ id: string; response: unknown }>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

    const payload = {
      toolResponse: {
        functionResponses,
      },
    }

    this.ws.send(JSON.stringify(payload))
  }

  disconnect(): void {
    this.isSetupComplete = false
    if (this.ws) {
      try {
        this.ws.close(1000, 'User disconnected')
      } catch {
        // Ignore close error
      }
      this.ws = null
    }
    this.connectionPromise = null
  }

  isConnected(): boolean {
    return Boolean(this.ws && this.ws.readyState === WebSocket.OPEN && this.isSetupComplete)
  }
}
