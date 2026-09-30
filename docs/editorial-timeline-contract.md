# Editorial timeline

Music and Motion use one project-scoped selection record, including full song metadata and its preview URL. Songs outside the five recommendations resolve through the catalog API.

`GET /api/projects/:id/editorial-timeline` returns `{ timeline }`. The authenticated project owner can send operation patches to the same endpoint:

```json
{
  "sourceAssetId": "current-source-asset-id",
  "patch": {
    "type": "effects",
    "effects": [{ "id": "whoosh-1", "title": "Whoosh", "url": "/audio/whoosh.wav", "start": 2.5, "end": 3.2, "offset": 0, "volume": 0.6, "muted": false }]
  }
}
```

Times use seconds. Operations are `music` (full track or null), `mix` (volume/mute), `effects` (explicit cues), `effect` (volume/mute by ID), and `transcript` (source-scoped transcript overrides). State lives in `projects.editor_state.editorialTimeline`. Saves preserve other settings, retry concurrent changes, and reject writes for a replaced source.

Orchestration cues in `projects.animation_plan.sfxCues` also appear in the effects lane, converting millisecond timings to seconds. Cues without audio URLs remain pending. Backend callers must supply a playable HTTPS or relative asset URL to produce sound.

Mounted Music and Motion views refresh backend state every five seconds while visible, and on focus. Writes are optimistic and serialized; failures show a retry action. Backend music selections update both views through the existing selection event. The timeline renders live source transcript edits through the editor's existing source-asset transcription endpoints.

Effect preview playback follows the video clock through scrubs and transcript cut jumps. Existing recommendation soundtrack playback is retained; catalog songs unresolved by the parent editor use the timeline's player. The export renderer's audio composition contract remains unchanged.
