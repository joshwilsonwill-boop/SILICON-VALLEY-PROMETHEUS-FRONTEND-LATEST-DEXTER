import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

const music = read('components/editor/music-tab-panel.tsx')
assert.match(music, /selectionTrayRef/)
assert.match(music, /document\.addEventListener\('pointerdown', dismissSelection, true\)/)
assert.match(music, /event\.key === 'Escape'/)
assert.match(music, /aria-label="Clear selected tracks"/)
assert.match(music, /setSelectedTrackIds\(new Set\(\)\)/)
assert.match(music, /PERSONAL_MUSIC_LIBRARY_STORAGE_KEY/)
assert.match(music, /\.from\('user_music_tracks'\)/)
assert.match(music, /\.from\('user-music'\)/)
assert.match(music, /uploadState === 'uploading'/)
assert.match(music, /activeCollection === 'premium'/)
assert.match(music, /activeCollection === 'trending'/)
assert.match(music, /min-h-\[38rem\]/)
assert.match(music, /rounded-\[20px\]/)

const suggestions = read('components/editor/ai-chat-suggestions.tsx')
assert.match(suggestions, /staggerChildren: 0\.065/)
assert.match(suggestions, /backdrop-blur-md/)
assert.doesNotMatch(suggestions, /whileHover=/)
assert.doesNotMatch(suggestions, /whileTap=/)

const desktopChat = read('components/editor/PrometheusChat.tsx')
assert.match(desktopChat, /relative z-20 mx-auto flex min-h-14/)
assert.match(desktopChat, /relative z-10 mx-auto -mb-6/)

const userMusicMigration = read('supabase/migrations/20260822000000_user_music_tracks.sql')
assert.match(userMusicMigration, /create table if not exists public\.user_music_tracks/)
assert.match(userMusicMigration, /on public\.user_music_tracks for select/)
assert.match(userMusicMigration, /values \('user-music', 'user-music', false\)/)
assert.match(userMusicMigration, /storage\.foldername\(name\)/)

console.log('music and chat interaction regression checks passed')
