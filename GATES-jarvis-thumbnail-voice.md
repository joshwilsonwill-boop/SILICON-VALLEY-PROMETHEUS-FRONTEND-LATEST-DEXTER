# Gates: Jarvis voice thumbnail creation

OWNS: lib/voice-companion/**, hooks/use-voice-companion.ts, lib/thumbnails/openai-image-edit.ts, lib/thumbnails/retention-prompt.ts, app/api/projects/[id]/thumbnails/nano-banana/route.ts, docs/jarvis-capability-gaps.md, GATES-jarvis-thumbnail-voice.md

Scope: Let voice Jarvis understand a video thumbnail request, open and generate through Thumbnail Studio, and send image edits to the configured OpenAI-compatible endpoint in its expected format.

- [x] G1: Voice Jarvis exposes a thumbnail creation action that checks playable video and hands the creator brief and selected headline to Thumbnail Studio.
  EVIDENCE: Source review confirmed the Live tool declaration, inspected-frame instructions, playable-video guard, and `generateNow` studio action. The existing studio applies the draft and queues generation after frame curation.

- [x] G2: OpenAI-compatible image edits are submitted as multipart form data with source and reference image files.
  EVIDENCE: Source review confirmed `/images/edits` receives `FormData`, repeated `image[]` file parts, and no manually set Content-Type boundary. Image sizes meet GPT Image 2 minimum pixels and 16-pixel edge increments; unsupported `input_fidelity` is omitted.

- [x] G3: The voice and image request changes integrate with the existing editor and API flow.
  EVIDENCE: Source review confirmed the voice tool uses the existing editor action bridge and the server route forwards FormData only to the configured OpenAI-compatible provider. Automated tests and typecheck were not run.
