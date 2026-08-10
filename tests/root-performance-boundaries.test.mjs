import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const readSource = (path) => readFileSync(join(repoRoot, path), "utf8");

test("the root layout does not eagerly ship route-specific or decorative clients", () => {
  const source = readSource("app/layout.tsx");

  assert.doesNotMatch(source, /ReactQueryProvider/);
  assert.doesNotMatch(source, /CustomCursor/);
  assert.doesNotMatch(source, /LuxuryMotionController/);
});

test("React Query is scoped to the editor and projects routes that use it", () => {
  const editorLayout = readSource("app/editor/layout.tsx");
  const projectsLayout = readSource("app/projects/layout.tsx");

  assert.match(editorLayout, /ReactQueryProvider/);
  assert.match(projectsLayout, /ReactQueryProvider/);
});

test("global decoration and the animated workspace backdrop wait until idle", () => {
  const rootEffects = readSource("components/root-client-effects.tsx");
  const workspaceFrame = readSource("components/workspace-frame.tsx");

  assert.match(rootEffects, /useDeferredEnhancementsReady/);
  assert.match(rootEffects, /dynamic\(\s*\(\) => import\(['"]@\/components\/ui\/custom-cursor['"]\)/);
  assert.match(rootEffects, /dynamic\(\s*\(\) => import\(['"]@\/components\/luxury-motion-controller['"]\)/);
  assert.match(rootEffects, /enhancementsReady\s*&&[\s\S]*UserPreferencesHydrator/);

  assert.match(workspaceFrame, /useDeferredEnhancementsReady/);
  assert.match(workspaceFrame, /enhancementsReady\s*&&\s*<IsoLevelWarp/);
});

test("the Supabase browser client loads only when auth, profile, or upload work begins", () => {
  const authProvider = readSource("components/auth/auth-provider.tsx");
  const profileHook = readSource("hooks/use-profile.ts");
  const studioUpload = readSource("components/video-upload-interface.tsx");

  for (const source of [authProvider, profileHook, studioUpload]) {
    assert.doesNotMatch(source, /^import\s+\{\s*createClient\s*\}\s+from\s+['"]@\/lib\/supabase\/client['"]/m);
    assert.match(source, /await import\(['"]@\/lib\/supabase\/client['"]\)/);
  }
});
