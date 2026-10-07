# Jarvis capability map

This describes the current voice companion and editor bridge. A tool existing in code does not mean an action ran successfully; Jarvis must wait for its result and report the confirmed state.

## Available now

| Capability | Current behavior and boundary |
| --- | --- |
| Voice and typed conversation | Gemini Live speech and text, transcript history, microphone mute, reconnect/error state, and ordered live messages. Network latency is not measured by the assistant. |
| Project and timeline state | Reads playable source availability, source and timeline duration, current workspace, playhead, fit mode, mute state, and transcript availability. |
| Visual inspection | `inspect_video` samples up to five decoded frames and restores the prior playhead/workspace when possible. Shot-specific claims require returned frames. |
| Preview navigation | Seek, play/pause, mute/unmute, workspace switching, fit/fill, playback speed, and frame stepping when the editor is linked. Workspace changes are confirmed against live editor state. |
| Transcript editing | Phrase cuts, filler-word detection/cuts, and silence removal require timed transcript data and a playable source. Destructive edits require an active editing session. |
| Music | Search uses the connected catalog. Preview means browser playback started; selection means the track was staged and saved. Staging switches to Motion. Neither result means a rendered file contains the music. |
| Editorial plan | The configured Gemini Live model chooses when to invoke the edit tool; a local heuristic then selects a caption preset and restrained transcript-timed camera moves, saves them to the project timeline, and opens Motion. This is not a separate server-side Flash planning call or a final render. No music is selected automatically. |
| Video thumbnails | Voice Jarvis checks that playable video exists, inspects sampled frames, uses transcript context to choose a truthful headline and creative direction, then opens Thumbnail Studio and starts generation. Studio uses the configured image provider and displays the generated result; generation failures must be reported from the Studio status. |
| Export entry points | Chat and Jarvis now share an authenticated VINCERE Mini-Run submission path. The job row is tracked in project export history and the editor can consume its MP4 receipt. This is a source-based Mini-Run, not a render of the editor's saved timeline. The gateway changes still need deployment and a receipt check before this is a live capability. |

## Fixed in the reliability work

- Empty projects no longer receive an invented duration, and transcript presence is not treated as playable video.
- Media inspection uses sampled decoded frames instead of stale cached imagery and reports when no frames could be read.
- Workspace changes are only reported after the editor confirms its active workspace.
- Editing access is started once for a delegated task and the tool waits for the editor to confirm it before protected changes continue.
- Music selection and preview are separate results. Exact requested titles are not silently replaced with similar tracks.
- Generic editorial plans no longer invent periodic camera moves or choose a soundtrack based on a broad brand tone. Movement uses timed transcript evidence and remains restrained.
- Supported caption and movement changes are saved through the project editorial-timeline API. Jarvis reports a save error or timeout instead of claiming the plan completed.
- The current source-copy export proof is labeled as a preview/source copy, not a completed render of edited media.

## Still unsupported or incomplete

| Gap | What is needed |
| --- | --- |
| Final edited render | The Mini-Run worker still builds its own source-based plan. The worker manifest/render path must be mapped to editor cuts, captions, movement, soundtrack, aspect ratio, and source storage before its output can be presented as this editor's final edited export. |
| Render lifecycle and delivery | The frontend now records Mini-Run jobs, polls worker status/progress, and routes completed output through an authenticated MP4 handoff. Production deployment and an actual receipt/output check remain outstanding. |
| Music embedded in editor output | Timeline selection and preview work, but the current Mini-Run request does not pass the selected editor soundtrack or effects into its audio mix. |
| Full editorial plan | LUT/color changes, sourced b-roll, and generated effects are not applied by the voice plan. Only caption style and timed movement cues are supported there. |
| Model-backed editorial planning | The live model selects and explains the tool action, but the plan itself is still heuristic code. A server-side Flash planner should return a validated, evidence-linked plan before the product describes it as model-generated. |
| Thumbnail generation receipt | Voice Jarvis can start thumbnail generation through the editor, but does not yet receive the completed image or final provider status as a tool result. It must not tell the user the thumbnail is ready until the Studio visibly confirms success. |
| Undo and durable action receipts | Add undo/redo plus durable per-action receipts with resulting timeline state before supporting long edit sequences. |
| Media repair | Jarvis can identify missing/unplayable media but cannot restore, relink, or upload source assets. |
| Complete save/recovery confirmation | Editorial timeline updates have save confirmation; other editor changes and refresh recovery do not share a general durable receipt yet. |
| Network latency targets | Ordered messages and setup timeouts are present, but recoverable turn retries and privacy-safe time-to-first-audio measurements remain follow-up work. |

Until the editor-to-render mapping and durable output lifecycle are connected, Jarvis must say that a preview was saved or that a source copy was prepared, and must not imply a completed edited export.
