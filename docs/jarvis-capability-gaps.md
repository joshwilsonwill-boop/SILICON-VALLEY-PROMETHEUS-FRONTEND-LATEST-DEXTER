# Jarvis capability map

This map reflects the voice companion's current tool declarations and editor bridge. “Available” means a code path exists; it does not imply that every action is enabled without an editor connection or editing access.

## Available now

| Capability | Current behavior and boundary |
| --- | --- |
| Voice and typed conversation | Gemini Live session, speech input/output, text instructions, transcript history, microphone mute, reconnect/error state. |
| Project and timeline state | Reads playhead, workspace, fit mode, mute state, source video availability, source duration, timeline duration, and transcript availability. |
| Preview navigation | Seek, play/pause, mute/unmute, workspace switching, fit/fill, playback speed, and frame stepping when the editor is connected. |
| Transcript editing | Phrase cuts, filler-word detection/cuts, and silence removal when timed transcript segments and an attached playable source are available. Mutations require Jarvis editing access. |
| Music | Preview a candidate track; stage a selection when editing access is enabled. A preview is not represented as already applied to the video. |
| Captions and editorial planning | Apply a supported caption preset with editing access. Generate an editorial plan from the source duration/transcript. |
| Export entry points | Open the export workflow or Master Video Review with editing access. This only opens the workflow; it does not confirm that rendering finished. |

## Fixed in this pass

- Empty projects no longer receive an invented 48-second duration.
- Jarvis now treats an attached playable video as separate from transcript presence and timeline length.
- The editor bridge reports source media state and keeps source duration separate from timeline duration.
- Project/media prompts require a live state lookup, concise empty-state responses, and honest limits on visual inspection.
- Tool handlers return failure when the editor, source media, transcript, or editing permission required by an action is missing. Export and music results no longer imply success beyond what was acknowledged.
- The dock now shows persistent `ON`/`OFF` indicators for Jarvis voice and editing access, with distinct state colors, switch semantics, and explicit accessible labels.

## Still unsupported or incomplete

| Gap | What is needed |
| --- | --- |
| Visual footage inspection in voice chat | The live companion currently does not send video frames. Add an explicit, user-visible frame inspection action before allowing shot/scene-specific answers. Until then, Jarvis must say it cannot see footage when no frames were provided. |
| Assistant-driven media repair | Jarvis can identify missing/unplayable media and direct the user to reattach it, but it has no tool to locate, restore, relink, or upload a source asset. |
| Full editorial plan application | The plan can propose zoom and music cues, but the connected editor action currently applies only the caption preset (and may seek to a plan point). Wire supported plan elements into timeline state before claiming they were applied. |
| Undo and action receipts | There is no Jarvis undo/redo tool or durable receipt that names each applied change and its resulting timeline state. Add these before supporting longer autonomous edit sequences. |
| Render lifecycle | Jarvis can open export/review flows but cannot report render queue progress, completion, failure, or the location of an exported file. |
| Save/recovery confirmation | The assistant has no explicit tool to verify that the latest edit is persisted or to report whether a source was recovered after refresh. |
| Consistent edit authorization | The primary edit tools now require the visible editing-access switch. Extend the same policy to any future mutating tool and make the action scope clear before multi-step edits. |

These are follow-up capabilities, not behaviors Jarvis should imply are already available.
