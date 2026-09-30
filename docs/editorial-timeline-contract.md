# Editorial timeline cue contract

The editorial timeline is project-scoped and bound to `sourceAssetId`. Song selection, sound-effect settings, and editor cue placements are saved in `editor_state.editorialTimeline`. A source replacement starts a fresh timeline so timestamps from the previous video cannot leak into the new edit.

The backend remains the source of generated placement context. `animation_plan` cue times are read in milliseconds and normalized to seconds for the timeline. The adapter currently maps `speechCues` to text, `transitionCues` to transitions, `movementCues` to movement, `brollCues` to B-roll, `sfxCues` to sound effects, `explainerCues` to explainers, `counterCues` to counters, and `backgroundCues` to background media. Each cue carries its original payload in `context`, including template, region, source, treatment, and other backend-specific fields that the editor does not interpret yet.

The normalized cue shape is:

```ts
{
  id: string
  type: 'text' | 'transition' | 'movement' | 'b-roll' | 'sound-effect' | 'explainer' | 'counter' | 'background'
  start: number // seconds on the source-video clock
  end: number   // seconds, exclusive
  title: string
  text?: string
  region?: string
  sourceId?: string
  sourceUrl?: string
  origin: 'backend' | 'editor'
  context?: Record<string, unknown>
}
```

The `cues` patch replaces the editor's current normalized placements. A timing edit keeps the cue ID and context, changes `start`/`end`, and sets `origin` to `editor`. On reads, edits with a matching backend cue ID retain the edited timing while new backend context is refreshed. Independent intervals are arranged into separate visual lanes to keep overlaps readable.

Music selection is shared across Music and Motion using the project-scoped selected-track event and persisted on the same timeline. Preview audio follows the source preview clock; a music clip spans the project duration, while sound effects use their cue in/out points and offsets.

To add another backend event family, add its cue array and timing conversion to `readBackendEditorialTimeline`, preserve its raw item in `context`, then provide a renderer or editing control for its normalized `type`.
