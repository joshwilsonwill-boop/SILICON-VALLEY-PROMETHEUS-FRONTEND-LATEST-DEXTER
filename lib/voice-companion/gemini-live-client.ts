'use client'

/**
 * Bidirectional WebSocket client for Google Gemini Multimodal Live API.
 * Provides real-time speech-to-speech, visual frame streaming, tool calls, and barge-in.
 */

export interface GeminiLiveConfig {
  wsUrl: string
  model?: string
  voiceName?: string
  systemInstruction?: string
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

export class GeminiLiveClient {
  private ws: WebSocket | null = null
  private config: GeminiLiveConfig
  private events: GeminiLiveEvents
  private isSetupComplete = false
  private connectionPromise: Promise<void> | null = null

  constructor(config: GeminiLiveConfig, events: GeminiLiveEvents = {}) {
    this.config = config
    this.events = events
  }

  async connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return this.connectionPromise || Promise.resolve()
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.wsUrl)

        const timeout = setTimeout(() => {
          if (!this.isSetupComplete) {
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
          const error = new Error('Gemini Live WebSocket connection failed. Verify GEMINI_API_KEY in environment variables.')
          this.events.onError?.(error)
          reject(error)
        }

        this.ws.onclose = (event) => {
          clearTimeout(timeout)
          this.isSetupComplete = false
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
        reject(error)
      }
    })

    return this.connectionPromise
  }

  private sendSetupMessage(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

    const defaultInstruction = `You are Jarvis, the high-intelligence creative companion and co-director built directly into Prometheus, the premium video production operating system.
You communicate naturally, expressively, concisely, and with authoritative human cadence.
You have direct visual perception of the video timeline and canvas.
When the user asks you to navigate, play, pause, seek, or change views, ALWAYS execute the appropriate tool function.
Keep your spoken responses fluid, punchy, conversational, and helpful. Never read out raw JSON or markup. Respond directly as an elite studio collaborator.`

    const setupPayload = {
      setup: {
        model: this.config.model || 'models/gemini-2.0-flash-exp',
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
          parts: [{ text: this.config.systemInstruction || defaultInstruction }],
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

    const payload = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: base64Pcm,
          },
        ],
      },
    }

    this.ws.send(JSON.stringify(payload))
  }

  sendVisualFrame(base64Jpeg: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isSetupComplete) return

    const payload = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'image/jpeg',
            data: base64Jpeg,
          },
        ],
      },
    }

    this.ws.send(JSON.stringify(payload))
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
