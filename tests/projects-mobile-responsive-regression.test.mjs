import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const projectsPage = readFileSync(join(root, 'components/projects/projects-page-v2.tsx'), 'utf8')
const projectCard = readFileSync(join(root, 'components/projects/project-card.tsx'), 'utf8')
const menuBar = readFileSync(join(root, 'components/ui/bottom-menu.tsx'), 'utf8')
const liquidChromeButton = readFileSync(join(root, 'components/ui/liquid-chrome-button.tsx'), 'utf8')

assert.match(projectsPage, /max-lg:overflow-x-hidden/, 'Projects must prevent page-level horizontal overflow below desktop width.')
assert.match(projectsPage, /max-lg:!grid-cols-1/, 'Projects must override the tablet grid with a single mobile column.')
assert.match(projectsPage, /touchOptimized/, 'The projects filter menu must opt into mobile touch targets.')
assert.match(projectsPage, /containerClassName="max-lg:flex max-lg:w-full"/, 'New Project must remain rendered and fill the mobile header width.')
assert.match(projectsPage, /max-lg:justify-center/, 'New Project content must stay centered when the control expands on mobile.')
assert.doesNotMatch(projectsPage, /containerClassName="max-lg:hidden"/, 'New Project must not depend on a hidden desktop control.')

assert.match(projectCard, /max-lg:p-4/, 'Mobile cards must have an inset, touch-friendly media layout.')
assert.match(projectCard, /bg-gradient-to-br from-gray-800 to-gray-900/, 'Missing or failed thumbnails must show a visible mobile gradient placeholder.')
assert.match(projectCard, /max-lg:line-clamp-2/, 'Mobile descriptions must clamp to two lines.')
assert.match(projectCard, /max-lg:min-h-11/, 'The mobile Open action must meet the 44px touch-target minimum.')
assert.match(projectCard, /max-lg:hidden/, 'Desktop-only card affordances must be hidden in the mobile layout.')

assert.match(menuBar, /touchOptimized\?: boolean/, 'MenuBar must expose an opt-in touch-target mode.')
assert.match(menuBar, /max-lg:size-11/, 'Touch-optimized filter controls must be at least 44px square on mobile.')
assert.match(liquidChromeButton, /containerClassName\?: string/, 'LiquidChromeButton must allow page-level responsive control of its wrapper.')

console.log('projects mobile responsive regression checks passed')
