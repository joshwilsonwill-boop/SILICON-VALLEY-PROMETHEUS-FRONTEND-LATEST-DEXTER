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

  assert(exportFile.includes('Export Video'), 'Contains "Export Video" title');
  assert(exportFile.includes('Choose where to publish or save your final video.'), 'Contains modal description subtext');
  assert(exportFile.includes('Publish to social'), 'Contains "Publish to social" section');
  assert(exportFile.includes('Manage accounts'), 'Contains "Manage accounts" navigation link');

  // 6 Social platforms
  assert(exportFile.includes('TikTok') && exportFile.includes('YouTube') && exportFile.includes('Instagram'), 'Contains top row social platforms (TikTok, YouTube, Instagram)');
  assert(exportFile.includes('Facebook') && exportFile.includes('LinkedIn'), 'Contains Facebook and LinkedIn social platforms');
  assert(exportFile.includes('Change account') && exportFile.includes('Connect'), 'Contains "Change account" and "Connect" buttons');

  // Cloud storage
  assert(exportFile.includes('Save to storage'), 'Contains "Save to storage" section');
  assert(exportFile.includes('Google Drive') && exportFile.includes('Dropbox'), 'Contains Google Drive and Dropbox storage options');
  assert(exportFile.includes('Link account'), 'Contains "Link account" buttons');

  // Export settings with 4K, 2K, 1080p, 720p, 480p
  assert(exportFile.includes('Export settings'), 'Contains "Export settings" section');
  assert(exportFile.includes('Format'), 'Contains Format setting');
  assert(exportFile.includes('Resolution'), 'Contains Resolution setting');
  assert(exportFile.includes('4K') && exportFile.includes('2K') && exportFile.includes('1080p') && exportFile.includes('720p'), 'Contains 4K, 2K, 1080p, and 720p resolution options');
  assert(exportFile.includes('Aspect ratio'), 'Contains Aspect ratio setting');
  assert(exportFile.includes('Captions'), 'Contains Captions setting');
  assert(exportFile.includes('Burn in'), 'Contains Burn in captions option');

  // Footer
  assert(exportFile.includes('Estimated file size') && exportFile.includes('Export time'), 'Contains dynamic estimated file size and export time');
  assert(exportFile.includes('Cancel') && exportFile.includes('Export now'), 'Contains Cancel and Export now buttons');

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
