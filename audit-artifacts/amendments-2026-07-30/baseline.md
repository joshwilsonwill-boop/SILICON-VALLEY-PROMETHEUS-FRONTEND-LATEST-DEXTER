# MAUL-2 baseline (2026-07-30T01:32:56+03:00)

## Current execution note (2026-07-30)

- `npm.cmd run typecheck`: exit 0 after the Editorial Cinema token/text changes.
- `npm.cmd run lint`: inherited baseline remains 8 errors and 32 warnings; a fresh full run exceeded the 180-second execution window before emitting a new summary.
- `npm.cmd run build`: a fresh production build remained active and responsive but exceeded the 360-second execution window; final verification must rerun it with a longer ceiling.

## typecheck

> my-v0-project@0.1.0 typecheck
> tsc --noEmit


## lint

C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS\hooks\use-voice-input.ts
  24:3  error  Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS\hooks\use-voice-input.ts:24:3
  22 |   const onTranscriptRef = useRef(onTranscript);
  23 |
> 24 |   onCompleteRef.current = onComplete;
     |   ^^^^^^^^^^^^^^^^^^^^^ Cannot update ref during render
  25 |   onTranscriptRef.current = onTranscript;
  26 |
  27 |   const stopListening = useCallback(() => {  react-hooks/refs
  25:3  error  Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS\hooks\use-voice-input.ts:25:3
  23 |
  24 |   onCompleteRef.current = onComplete;
> 25 |   onTranscriptRef.current = onTranscript;
     |   ^^^^^^^^^^^^^^^^^^^^^^^ Cannot update ref during render
  26 |
  27 |   const stopListening = useCallback(() => {
  28 |     shouldAutoSendRef.current = false;         react-hooks/refs

✖ 40 problems (8 errors, 32 warnings)
  0 errors and 1 warning potentially fixable with the `--fix` option.
