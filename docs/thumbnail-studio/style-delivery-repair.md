# Thumbnail Studio style delivery repair

The Studio previously received its class names through a CSS module and its rules through a separate editor route CSS asset. Mounting the real component with class exports but without that CSS reproduces the unstyled document-flow dialog and oversized reference images shown in the report.

`ThumbnailWorkspace.styles.ts` now owns the full stylesheet and typed class names. `ThumbnailWorkspace` renders that stylesheet inside its body portal in the same React commit as its dialog. The Studio therefore does not depend on loading a separate route stylesheet for its layout. All selectors and animation names have a `prom-thumbnail-` prefix, and the existing theme variables, responsive rules, reduced-motion settings, and controls remain available.

This addresses missing Studio style delivery. The specific network or browser condition responsible for the user's screenshot has not been observed; the exact failing URL has not been supplied.

## Verification

The mounted-component checks use the real Workspace and no external stylesheets. They check fixed dialog positioning, contained reference images, reference filtering and search, source and aspect selection, tabs, generation and iteration callbacks, cover save and download callbacks, cancellation, close/reopen, Escape, focus restoration, and body scroll cleanup. They do not claim to measure browser layout pixels.

```powershell
node --test --test-reporter=tap tests/thumbnail-workspace-css.test.mjs tests/thumbnail-workspace-runtime.test.mjs tests/iterative-thumbnail-modification.test.mjs
node scripts/verify-thumbnail-studio-design.mjs
```

The runtime regression failed before the repair with `static !== fixed` and `block !== grid`, then passed after the component began mounting its own stylesheet. The CSS contract check also has a negative control that removes the shell selector and must fail.

## Preview fixture

```powershell
node scripts/serve-thumbnail-workspace-fixture.mjs
```

The fixture uses the real component inside a transformed, clipped parent. Headline, emphasis, creative direction, aspect, design, source frames, references, and version history are controlled state. PNG/JPG/WebP uploads work locally. Generation copies the selected source frame after a short cancellable delay; cover save changes local preview state and download exports the active fixture image. Version restore and chat refinement use the same callbacks as the Studio. It makes no generation or project-save requests.

Its generated app lives under the ignored `.tmp/thumbnail-workspace-runtime` directory. Use `--build` to compile it and `--start` to serve that production build. Both development and production previews use port 3220.

Desktop/mobile browser measurements and the original live page verification remain separate acceptance gates. A browser policy rejection prevents repeating the previously denied local browser URL through an alternate surface.
