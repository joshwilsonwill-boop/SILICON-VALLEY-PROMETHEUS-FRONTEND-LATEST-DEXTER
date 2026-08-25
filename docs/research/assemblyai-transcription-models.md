# AssemblyAI Transcription Models And Latency

Researched 2026-08-24 against AssemblyAI's official documentation. This note
applies to the editor's imported, pre-recorded source-video workflow.

## Recommendation

Use AssemblyAI's asynchronous **Pre-recorded STT** API with:

```json
{
  "speech_models": ["universal-3-5-pro"]
}
```

AssemblyAI documents `universal-3-5-pro` as its "highest accuracy, fastest
model" for pre-recorded transcription. The source transcription service is
currently requesting `universal-2`, so it does not use the current model.

Source: [Select the speech model](https://www.assemblyai.com/docs/pre-recorded-audio/select-the-speech-model)

## What Fast Means Here

AssemblyAI says the vast majority of pre-recorded transcriptions finish in
under 45 seconds and reports real-time factors as low as 0.008x. Actual time
also includes the provider fetching the source URL, queueing, media decoding,
and requested analysis features.

Source: [How long does it take to transcribe a file?](https://www.assemblyai.com/docs/faq/how-long-does-it-take-to-transcribe-a-file)

## Do Not Replace Batch Processing With Streaming

Streaming is not an acceleration route for an already-uploaded video.
AssemblyAI documents that pre-recorded audio must be sent to the streaming API
at its recorded pace, while the Pre-recorded API processes the file as fast as
possible. Keep the async pre-recorded job plus status polling for source video.

Source: [Stream a pre-recorded audio file in real time](https://www.assemblyai.com/docs/streaming/guides/stream_prerecorded_file_realtime)

## Sync STT Is A Separate Short-Clip Path

AssemblyAI's Sync STT API can return a transcript in milliseconds, but it is
limited to audio from 80 ms to 120 seconds and accepts uploaded bytes rather
than a remotely accessible `audio_url`. It would require downloading and
extracting short audio clips, so it cannot directly replace the signed-R2-URL
source-video pipeline. It may be appropriate later for brief voice-input or
preview features.

Source: [Transcribe a short audio file](https://www.assemblyai.com/docs/sync-stt/getting-started/transcribe-a-short-audio-file)

## Implementation Consequence

For full imported videos, update the async request from:

```ts
speech_models: ['universal-2']
```

to:

```ts
speech_models: ['universal-3-5-pro']
```

This is a model upgrade, not a guarantee that a long asset is instant. Continue
to use a valid, sufficiently long-lived signed R2 URL and report bounded
progress/error states in the UI.
