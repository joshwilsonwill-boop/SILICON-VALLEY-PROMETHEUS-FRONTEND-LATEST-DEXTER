# Jarvis session reliability findings — 1 October 2026

Evidence: the user's exported `jarvis-voice-session.txt` and screenshot of the persistent “Scrubbed to 36.7s” cursor badge. The text log records conversation, not tool execution or original audio. Its timestamps do not establish speech completion time or network latency. The authenticated production session has not been replayed.

## User pain and evidence

| Pain | Evidence | Engineering finding / response |
| --- | --- | --- |
| Jarvis announces Motion while the user reports remaining in the previous view | 20:44:50–20:45:16 | Voice navigation previously returned the requested tab as success after invoking a callback. It now checks the committed editor context and reports an unconfirmed switch as a failure. |
| An activity cursor and moving takeover treatment persist without useful work | Screenshot; 20:45:15 | Inspection used five continuous animated seeks and never cleared the final badge. Inspection now uses awaited seeks, restores the previous view/playhead, and clears activity. Enabled editing access is shown as ready between actions. |
| Communication feels delayed and Jarvis dismisses the report | 20:44:23 | A runtime reproduction proved that awaiting an editor tool on the incoming socket message queue held back subsequent speech and interruption events. Tools now use their own ordered queue. This removes an application delay; it does not eliminate network or model latency. Instructions acknowledge reported lag instead of claiming it can be measured from the model's side. |
| Video exists but visual inspection fails | 20:43:00 and 20:43:47 | Music unmounts the source video. The former inspection callback also did not await its seek. Inspection now temporarily opens Editor when needed, waits for decoded frames with a bounded timeout, and sends only frames actually captured. Codec and cross-origin failures still require testing with the actual source. |
| Commands can stall after human intervention | Runtime reproduction | Cancelling a cursor animation previously left its Promise unresolved. Cancellation now settles it as false. A missing tab/control is no longer reported as completed takeover navigation. |
| The conversation transcript contains garbled wording and an unexpected long Spanish passage | 20:42:08 and 20:43:39 | The original audio is unavailable, so the text cannot establish what was spoken or identify the passage's source. Preserve the export as evidence. Do not rewrite or silently discard uncertain turns. |

## Verification

`node --import tsx --test tests/jarvis-session-runtime.test.mjs` exercises the production coordinator, live client and session controls. Initial reproductions failed for unresolved cancellation, missing navigation controls and tool-blocked speech. The resulting 12 scenarios cover these failures, delayed navigation, invalid destinations, delayed decoding, stalled frame readers, source/session changes, restoration, idle activity, late responses and dropped connections.

The frame and workspace tests use controlled editor handlers; they verify orchestration and error reporting. They do not establish that the user's real source is readable or that the deployed browser now renders Motion correctly.

## Next iteration

1. Repeat the production scenario: open Music, ask Jarvis to describe the video, ask it to open Motion, and interrupt it during inspection. Confirm the visible workspace and that activity stops between commands. Export the resulting conversation.
2. Capture original microphone and assistant audio alongside the text, with a clear recording control. Retain an audio reference for disputed wording. Tag source playback separately so that source dialogue is not assumed to be a user instruction. Exact speech fidelity cannot be established from model transcription alone.
3. Add concise timings and command results to session evidence: request, first reply audio, action start, confirmed state, interruption and failure. Keep raw console output out of the user download. Measure browser/model/network delays separately before tuning the audio pipeline.
4. Verify the user's source media in Editor, Music and Motion, including slow buffering and frame-read restrictions. Then improve unsupported edit operations based on confirmed failures and the next session, rather than announcing edits that only exist as plans.

Existing unrelated editor, asset and thumbnail changes are outside this patch.
