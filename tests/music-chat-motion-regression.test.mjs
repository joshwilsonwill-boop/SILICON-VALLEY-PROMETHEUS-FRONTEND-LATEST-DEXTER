import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run() {
  const musicPlayer = read('components/ui/music-player.tsx')
  assert.equal(musicPlayer.includes('ARTIFICIAL_BUFFER_MS'), false)
  assert.equal(musicPlayer.includes('canStartPlayback'), false)
  assert.match(musicPlayer, /void audio\.play\(\)\.catch/)
  assert.match(musicPlayer, /data-testid="rotating-album-art"/)
  assert.match(musicPlayer, /src=\{resolvedAlbumArt\}/)
  assert.match(musicPlayer, /setResolvedAlbumArt\(FALLBACK_ALBUM_ART\)/)
  assert.match(musicPlayer, /style=\{reduceMotion \? undefined : \{ rotate: rotation \}\}/)

  const musicPanel = read('components/editor/music-tab-panel.tsx')
  assert.match(musicPanel, /const handleTrackActivate = React\.useCallback/)
  assert.match(musicPanel, /setPlayingTrackId\(track\.id\)/)
  assert.match(musicPanel, /onFocus=\{\(\) => handleTrackActivate\(track\)\}/)
  assert.match(musicPanel, /onClick=\{\(\) => onPlayPause\(track\)\}/)
  assert.match(musicPanel, /aria-label=\{playing \? `Pause \$\{track\.title\}` : `Play \$\{track\.title\}`\}/)
  assert.match(musicPanel, /displayTracks\.find\(\(track\) => track\.id === playingTrackId\) \?\? activeTrack \?\? null/)
  assert.match(musicPanel, /currentPlayerTrack \? buildSelectedSongDisplay\(currentPlayerTrack\) : null/)

  const chatStyleSelectorPath = 'components/editor/chat-style-selector.tsx'
  assert.equal(existsSync(join(root, chatStyleSelectorPath)), true)
  const chatStyleSelector = read(chatStyleSelectorPath)
  assert.match(chatStyleSelector, /GalleryHorizontalEnd/)
  assert.match(chatStyleSelector, /STYLE_TEMPLATES\.map/)
  assert.match(chatStyleSelector, /onSelectStyle\(template\)/)
  assert.match(chatStyleSelector, /whileHover/)

  const uploadInterface = read('components/video-upload-interface.tsx')
  assert.match(uploadInterface, /ChatStyleSelector/)
  assert.match(uploadInterface, /StudioCinematicMarqueeRails/)
  assert.match(uploadInterface, /studio-marquee-left/)
  assert.match(uploadInterface, /studio-marquee-right/)
  assert.match(uploadInterface, /animation-play-state: paused/)
  assert.match(uploadInterface, /activeStyleSignal/)
  assert.match(uploadInterface, /editActionPrompt/)
  assert.match(uploadInterface, /focusRequestKey/)
  assert.match(uploadInterface, /text-\[35px\].*sm:text-\[48px\].*lg:text-\[59px\]/)

  const editorPage = read('app/editor/[id]/page.tsx')
  assert.match(editorPage, /ChatStyleSelector/)
  assert.match(editorPage, /ChatSelectedStylePill/)
  assert.match(editorPage, /selectedStyleTemplate/)
  assert.match(editorPage, /selectedChatStyleTemplate \?\? selectEditStyleTemplate/)
  assert.equal(editorPage.includes('Open grid tools'), false)

  const prometheusChatRoute = read('app/api/prometheus-chat/route.ts')
  assert.match(prometheusChatRoute, /normalizeSelectedStyleTemplate/)
  assert.match(prometheusChatRoute, /selectedStyleTemplate/)

  const motionCanvas = read('app/editor/motion/components/motion-canvas.tsx')
  const motionOverlayPath = 'app/editor/motion/components/motion-first-run-orbit.tsx'
  assert.equal(existsSync(join(root, motionOverlayPath)), true)
  const motionOverlay = read(motionOverlayPath)
  assert.match(motionCanvas, /MotionFirstRunOrbit/)
  assert.match(motionOverlay, /prometheus\.motion\.first-run-orbit\.v1/)
  assert.match(motionOverlay, /MagneticSelectorButton/)
  assert.match(motionOverlay, /AudioContext/)
  assert.match(motionOverlay, /Enter Motion Brain/)
}

run()
