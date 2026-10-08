import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();

function readFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

const args = process.argv.slice(2);
const flag = args[0] || '--all';

let passed = true;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    passed = false;
  } else {
    console.log(`PASS: ${message}`);
  }
}

if (flag === '--check-export-modal' || flag === '--all') {
  console.log('\n--- Checking Export Modal Parity ---');
  const exportFile = readFile('components/editor/ExportDrawer.tsx');
  const pageFile = readFile('app/editor/[id]/page.tsx');
  const providerFile = readFile('lib/oauth/provider-metadata.ts');

  assert(exportFile.includes('Export Video'), 'Contains the Export Video title');
  assert(exportFile.includes('Choose where to publish or save your final video.'), 'Contains the restored export dialog guidance');
  assert(exportFile.includes('Publish to social'), 'Contains "Publish to social" section');
  assert(exportFile.includes('Manage accounts'), 'Contains "Manage accounts" navigation link');
  assert(exportFile.includes('grid-cols-2 gap-2 sm:grid-cols-3'), 'Shows the compact three-column social account grid');
  assert(['tiktok', 'youtube', 'instagram', 'x', 'facebook', 'linkedin'].every(provider => exportFile.includes(`'${provider}'`)), 'Contains all configured social platform destinations');
  assert(providerFile.includes("name: 'YouTube'") && providerFile.includes("name: 'TikTok'") && providerFile.includes("name: 'Instagram'"), 'Provider metadata supplies platform names');
  assert(exportFile.includes('Change account') && exportFile.includes('Connect'), 'Contains account management actions');
  assert(exportFile.includes('Save to storage'), 'Contains "Save to storage" section');
  assert(exportFile.includes("'google_drive'") && exportFile.includes("'dropbox'"), 'Contains Google Drive and Dropbox destinations');
  assert(exportFile.includes('Export settings'), 'Contains "Export settings" section');
  assert(exportFile.includes('grid-cols-2 gap-2 sm:grid-cols-4'), 'Shows compact four-field export settings');
  assert(exportFile.includes('aria-disabled="true"') && exportFile.includes('Fixed by the current renderer'), 'Marks fixed renderer settings as unavailable for editing');
  assert(exportFile.includes('Format') && exportFile.includes('MP4'), 'Shows the currently supported MP4 format');
  assert(exportFile.includes('1080p Portrait') && exportFile.includes('9:16 Portrait'), 'Shows the fixed portrait output profile');
  assert(exportFile.includes('Captions') && exportFile.includes('Not applied'), 'Shows caption availability accurately');
  assert(exportFile.includes('Saved edits, editor captions, and selected music are not applied.'), 'Explains the current render limitation');
  assert(exportFile.includes('onStartRender()') && exportFile.includes("isRendering ? 'Exporting…' : 'Export now'"), 'Export action starts the tracked source render job');
  assert(pageFile.includes('setShowExport(true)'), 'Editor Export action opens the modal');
  assert((pageFile.match(/<ExportDrawer\b/g) || []).length === 2, 'Export modal is mounted in desktop and mobile editor views');
  assert(pageFile.includes('onStartRender={startProjectRender}'), 'Modal uses the project render action');

  if (flag === '--check-export-modal') {
    if (!passed) process.exit(1);
    console.log('export modal parity verification passed');
    process.exit(0);
  }
}

if (flag === '--check-motion-icons' || flag === '--all') {
  console.log('\n--- Checking Motion Icons Parity ---');
  const motionFile = readFile('components/editor/motion-edit-workspace.tsx');

  assert(motionFile.includes('TREATMENTS'), 'Contains treatments configuration');
  assert(motionFile.includes('Contrast'), 'Contrast treatment has Contrast icon');
  assert(motionFile.includes('Sparkles'), 'Clean treatment has Sparkles icon');
  assert(motionFile.includes('Flame') || motionFile.includes('SunMedium') || motionFile.includes('Sun'), 'Warm treatment has warm icon');
  assert(motionFile.includes('CircleDot') || motionFile.includes('Palette'), 'Mono treatment has mono icon');
  assert(motionFile.includes('Maximize2') && motionFile.includes('Crop'), 'Contains icon-driven frame controls');
  assert(motionFile.includes('Monitor') || motionFile.includes('Smartphone') || motionFile.includes('Square'), 'Contains aspect ratio preset icons');

  if (flag === '--check-motion-icons') {
    if (!passed) process.exit(1);
    console.log('motion icons parity verification passed');
    process.exit(0);
  }
}

if (flag === '--check-header-tabs' || flag === '--all') {
  console.log('\n--- Checking Header Tabs Parity ---');
  const pageFile = readFile('app/editor/[id]/page.tsx');

  assert(pageFile.includes("'Export'") || pageFile.includes('"Export"'), "WORKSPACE_TABS includes 'Export'");
  assert(pageFile.includes('setShowExport(true)'), 'Clicking Export tab activates showExport');

  if (flag === '--check-header-tabs') {
    if (!passed) process.exit(1);
    console.log('header tabs parity verification passed');
    process.exit(0);
  }
}

if (flag === '--check-types' || flag === '--all') {
  console.log('\n--- Checking TypeScript Typecheck ---');
  try {
    execSync('node --max-old-space-size=4096 ./node_modules/typescript/bin/tsc --noEmit', { stdio: 'inherit' });
    console.log('TypeScript compilation succeeded with zero errors.');
  } catch (err) {
    console.error('TypeScript check failed:', err);
    process.exit(1);
  }

  if (flag === '--check-types') {
    console.log('export and motion typecheck verification passed');
    process.exit(0);
  }
}

if (!passed) {
  process.exit(1);
}
console.log('all export and motion parity verifications passed');
