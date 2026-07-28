import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function run() {
  const loaderPath = "lib/prometheus-assistant/project-context.ts";
  assert.equal(existsSync(join(root, loaderPath)), true, loaderPath);
  const loader = read(loaderPath);

  // Server-only loader with graceful degradation (never throws into the route)
  assert.match(loader, /import 'server-only'/);
  assert.match(loader, /export async function loadProjectChatContext\(/);
  assert.match(loader, /\} catch \(error\) \{[\s\S]*return null/);

  // Prompt-size discipline: transcript + total context are hard-capped
  assert.match(loader, /TRANSCRIPT_BUDGET_CHARS = 1_800/);
  assert.match(loader, /CONTEXT_BUDGET_CHARS = 3_000/);
  assert.match(loader, /function clipToBudget\(/);
  assert.match(loader, /middle omitted/);

  // Full AssemblyAI transcript is read from R2, timecoded for frame citation
  assert.match(loader, /downloadTextFromR2\(/);
  assert.match(loader, /function compactTranscript\(/);
  assert.match(loader, /transcript_r2_key/);
  assert.match(loader, /source: 'r2'/);
  assert.match(loader, /source: 'db-preview'/);
  assert.match(loader, /formatTimecode\(start\)/);

  // Video identity comes from source_assets (or project source_profile fallback)
  assert.match(loader, /\.from\('source_assets'\)/);
  assert.match(loader, /original_filename, mime_type, duration_ms/);
  assert.match(loader, /Video: none uploaded yet\./);

  // Prompt renderer exists and is capped
  assert.match(loader, /export function formatProjectContextForPrompt\(/);
  assert.match(loader, /clipToBudget\(lines\.join\('\\n'\), CONTEXT_BUDGET_CHARS\)/);

  // Both chat routes actually consume the project context
  const streamRoute = read("app/api/prometheus-chat/stream/route.ts");
  assert.match(streamRoute, /loadProjectChatContext/);
  const route = read("app/api/prometheus-chat/route.ts");
  assert.match(route, /loadProjectChatContext/);
}

run();
