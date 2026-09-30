# Flight — Above the ordinary

A 12-second motion film built from the supplied airplane icon.

Open **preview.html** to watch with sound, or play **flight.mp4** directly.

- **flight.mp4** — 1920 × 1080, 60 fps, H.264, stereo AAC audio.
- **flight-silent.mp4** — the same film without sound, useful for web embeds.
- **01-reveal.png**, **02-flight.png**, **03-finale.png** — full-resolution preview frames.
- **Flight.tsx** — editable, frame-driven Remotion source.
- **public/aircraft.png** — the original aircraft isolated for independent animation.
- **public/sound-design.wav** — original stereo score and effects.

The animation moves from a charcoal dimensional reveal to an accelerated flight with typography, then an ivory product hero. Motion, lighting, trails, type reveals, and the circular transition are driven by explicit frame timings. The source image supplies the aircraft; the tile is rebuilt as layered surfaces so it can move separately.

To regenerate from this repository, run `node artifacts/flight-motion/render.mjs video`. Then mux the sound with FFmpeg:

```powershell
ffmpeg -y -i artifacts/flight-motion/flight-silent.mp4 -i artifacts/flight-motion/public/sound-design.wav -c:v copy -af "loudnorm=I=-18:TP=-1.5:LRA=11" -ar 48000 -c:a aac -b:a 256k -movflags +faststart -shortest artifacts/flight-motion/flight.mp4
```

The render script uses the repository's installed React and Remotion packages and local Google Chrome. All fonts and visual/audio assets are bundled locally. No external asset requests are needed for playback.
