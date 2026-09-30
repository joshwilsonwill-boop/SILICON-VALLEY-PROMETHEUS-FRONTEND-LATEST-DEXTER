from pathlib import Path
from collections import deque
import math, shutil, wave
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / 'public'
ASSETS.mkdir(parents=True, exist_ok=True)
source = Path(r'C:\Users\HomePC\AppData\Local\Temp\codex-clipboard-1cea00ba-f1ed-45d4-9a0f-ed15cc76bd07.png')
if not source.exists():
    source = ASSETS / 'reference.png'
if source.resolve() != (ASSETS / 'reference.png').resolve():
    shutil.copy2(source, ASSETS / 'reference.png')
im = Image.open(source).convert('RGB').crop((328, 196, 672, 540))
rgb = np.asarray(im)
bright = rgb.mean(axis=2) > 94
height, width = bright.shape
mask = np.zeros_like(bright)
queue = deque([(170, 165)])
while queue:
    x, y = queue.popleft()
    if x < 0 or y < 0 or x >= width or y >= height or mask[y, x] or not bright[y, x]:
        continue
    mask[y, x] = True
    queue.extend(((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
# Fill enclosed cockpit pixels, retaining the original black window and shading.
outside = np.zeros_like(mask)
queue = deque([(0, 0)])
while queue:
    x, y = queue.popleft()
    if x < 0 or y < 0 or x >= width or y >= height or outside[y, x] or mask[y, x]:
        continue
    outside[y,x] = True
    queue.extend(((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
mask |= ~outside
alpha = Image.fromarray((mask*255).astype('uint8')).filter(ImageFilter.GaussianBlur(.42))
plane = im.convert('RGBA')
plane.putalpha(alpha)
plane.save(ASSETS / 'aircraft.png')
fonts = Path(r'C:\Windows\Fonts')
for original, target in [('segoeui.ttf','sans.ttf'),('segoeuil.ttf','light.ttf'),('seguisb.ttf','semibold.ttf')]:
    shutil.copy2(fonts / original, ASSETS / target)

# Original sound design: a soft tonal bed, tactile ticks, air sweeps and sub impacts.
SR, LENGTH = 48000, 12
t = np.arange(SR*LENGTH) / SR
rng = np.random.default_rng(19)
left = np.zeros_like(t)
right = np.zeros_like(t)
def add(sound, pan=0):
    global left, right
    left += sound * math.sqrt((1-pan)/2)
    right += sound * math.sqrt((1+pan)/2)
def tone(start, duration, freq, gain, pan=0):
    u = t - start
    active = (u >= 0) & (u <= duration)
    env = np.clip(u/.12, 0, 1) * np.exp(-np.maximum(u,0)/(duration*.45))
    env *= np.clip((duration-u)/.3, 0, 1)
    signal = np.sin(2*np.pi*freq*u) + .18*np.sin(2*np.pi*freq*2.003*u)
    add(signal * env * active * gain, pan)
def impact(start, gain=.25):
    u = np.maximum(t-start,0)
    active = (t >= start) & (u < 1.8)
    phase = 2*np.pi*(46*u + 18*.13*(1-np.exp(-u/.13)))
    add(np.sin(phase)*np.exp(-u*4.6)*active*gain)
def whoosh(start, duration, gain=.10, pan=0):
    u = (t-start)/duration
    active = (u > 0) & (u < 1)
    envelope = np.sin(np.pi*np.clip(u,0,1))**3
    noise = rng.normal(0,1,len(t))
    noise = np.convolve(noise,np.ones(12)/12,mode='same')
    signal = noise + .12*np.sin(2*np.pi*(140*t+180*duration*np.clip(u,0,1)**2))
    add(signal * envelope * active * gain, pan)
for start in [.0, 4.35, 8.0]:
    for frequency, pan in [(130.81,-.35),(196,.35),(261.63,-.12),(293.66,.18)]:
        tone(start,4.2,frequency,.035,pan)
for start, frequency, pan in [(1.2,1046,-.15),(2.05,1318,.2),(3.35,1568,.1),(5.32,783,-.4),(6.1,1046,.4),(8.48,1318,.15),(9.05,1568,-.2)]:
    tone(start,.75,frequency,.034,pan)
for start,gain in [(1.15,.25),(4.95,.34),(8.38,.28)]:
    impact(start,gain)
for start,duration,gain,pan in [(.45,1.05,.14,-.3),(1.45,.9,.10,.25),(4.28,1.0,.32,.15),(5.1,.85,.18,-.3),(7.65,1.1,.24,.3),(8.4,.8,.12,-.15)]:
    whoosh(start,duration,gain,pan)
fade = np.clip(t/.25,0,1)*np.clip((LENGTH-t)/1.1,0,1)
stereo = np.column_stack([left*fade,right*fade])
stereo = np.tanh(stereo*1.25)
with wave.open(str(ASSETS/'sound-design.wav'),'wb') as wav:
    wav.setnchannels(2)
    wav.setsampwidth(2)
    wav.setframerate(SR)
    wav.writeframes((stereo*32767).astype('<i2').tobytes())
print('Prepared original aircraft, fonts, and 12-second stereo sound design.')
