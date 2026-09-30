import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();

function fileHash(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function checkPreviews() {
  const previewsDir = path.join(root, 'public', 'style-previews');
  const requiredFiles = [
    'iman-1.jpg',
    'iman-1.jfif',
    'iman-2.jpg',
    'iman-2.jfif',
    'podcast-1.jpg',
    'podcast-1.jfif',
    'reels-heat-1.webp',
    'reels-heat-2.webp',
    'docs-story-1.jpg',
    'docs-story-1.jfif',
    'dark-cinematic-1.jpg',
    'dark-cinematic-1.jfif',
    'red-statue-1.jpg',
    'red-statue-1.jfif',
    'minimal-subtle-1.jpg',
  ];

  for (const file of requiredFiles) {
    const fullPath = path.join(previewsDir, file);
    assert.ok(fs.existsSync(fullPath), `Preview file missing: ${file}`);
    const stat = fs.statSync(fullPath);
    assert.ok(stat.size > 20000, `Preview file is too small (low quality/empty): ${file} (${stat.size} bytes)`);
  }

  // Ensure docs-story and dark-cinematic are not identical duplicates (no shared placeholder)
  const docsHash = fileHash(path.join(previewsDir, 'docs-story-1.jpg'));
  const noirHash = fileHash(path.join(previewsDir, 'dark-cinematic-1.jpg'));
  assert.notEqual(docsHash, noirHash, 'Docs Story and Cinematic Noir must not share the same placeholder hash');

  const punchyHash = fileHash(path.join(previewsDir, 'iman-1.jpg'));
  const cleanHash = fileHash(path.join(previewsDir, 'iman-2.jpg'));
  assert.notEqual(punchyHash, cleanHash, 'Punchy and Clean must have distinct previews');

  console.log('previews verification passed');
}

function checkMappings() {
  const styleTemplatesSource = fs.readFileSync(path.join(root, 'lib', 'styles', 'style-templates.ts'), 'utf8');
  const airtableRouteSource = fs.readFileSync(path.join(root, 'app', 'api', 'airtable', 'images', 'route.ts'), 'utf8');

  // Verify unique preview mapping in style templates
  assert.match(styleTemplatesSource, /\/style-previews\/minimal-subtle-1\.jpg/, 'Minimal subtle must have dedicated preview image');
  assert.match(styleTemplatesSource, /\/style-previews\/docs-story-1\.jpg/, 'Docs story must have dedicated preview image');
  assert.match(styleTemplatesSource, /\/style-previews\/dark-cinematic-1\.jpg/, 'Cinematic noir must have dedicated preview image');

  // Verify Airtable images route emits styleKey, thumbUrl, and imageUrl
  assert.match(airtableRouteSource, /styleKey:/, 'Airtable route must emit styleKey');
  assert.match(airtableRouteSource, /thumbUrl:/, 'Airtable route must emit thumbUrl');
  assert.match(airtableRouteSource, /imageUrl:/, 'Airtable route must emit imageUrl');

  console.log('mappings verification passed');
}

function checkStudio() {
  const studioModalSource = fs.readFileSync(path.join(root, 'components', 'editor', 'ThumbnailStudioModal.tsx'), 'utf8');

  // Verify that ThumbnailStudioModal renders currentDisplayUrl from generatedDataUrl or previewDataUrl
  assert.match(studioModalSource, /currentDisplayUrl = generatedDataUrl \?\? previewDataUrl/, 'Studio modal must derive currentDisplayUrl from generated or preview dataUrl');

  // Verify that activeUrl is bound to generatedDataUrl
  assert.match(studioModalSource, /const activeUrl = generatedDataUrl/, 'Studio modal must bind export activeUrl to generatedDataUrl');

  // Verify action buttons require generatedDataUrl per regression contract
  assert.match(studioModalSource, /disabled=\{!generatedDataUrl\}/, 'Download button must respect generatedDataUrl guard');
  assert.match(studioModalSource, /disabled=\{isExporting \|\| !generatedDataUrl\}/, 'Save button must respect generatedDataUrl guard');

  console.log('studio verification passed');
}

function checkRegressions() {
  execSync('node tests/short-form-thumbnail-engine.test.mjs', { stdio: 'inherit' });
  execSync('node tests/thumbnail-studio-pipeline.test.mjs', { stdio: 'inherit' });
  execSync('node tests/nano-banana-image.test.mjs', { stdio: 'inherit' });
  execSync('node tests/jarvis-thumbnail-ux.test.mjs', { stdio: 'inherit' });

  console.log('regressions verification passed');
}

const arg = process.argv[2];
if (arg === '--check-previews') {
  checkPreviews();
} else if (arg === '--check-mappings') {
  checkMappings();
} else if (arg === '--check-studio') {
  checkStudio();
} else if (arg === '--check-regressions') {
  checkRegressions();
} else {
  checkPreviews();
  checkMappings();
  checkStudio();
  checkRegressions();
}
