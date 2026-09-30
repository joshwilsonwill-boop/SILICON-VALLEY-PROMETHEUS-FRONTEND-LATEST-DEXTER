from pathlib import Path
import subprocess, json, time, zipfile
from PIL import Image, ImageOps, ImageDraw

root = Path(__file__).resolve().parent
def run(args):
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout

silent = root / 'flight-silent.mp4'
deadline = time.time() + 600
while True:
    try:
        meta = json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(silent)]))
        video = next(s for s in meta['streams'] if s['codec_type']=='video')
        if int(video.get('nb_frames',0)) == 720 and float(meta['format']['duration']) >= 12:
            break
    except (subprocess.CalledProcessError, StopIteration, KeyError, ValueError):
        pass
    if time.time() > deadline:
        raise RuntimeError('The full silent render is not ready.')
    time.sleep(4)

print('Mastering stereo audio and preparing the final MP4...', flush=True)
run(['ffmpeg','-y','-nostdin','-v','error','-i',str(silent),'-i',str(root/'public/sound-design.wav'),'-c:v','copy','-af','loudnorm=I=-18:TP=-1.5:LRA=11','-ar','48000','-c:a','aac','-b:a','256k','-movflags','+faststart','-shortest',str(root/'flight.mp4')])
print('Checking the complete video and audio streams...', flush=True)
meta = json.loads(run(['ffprobe','-v','error','-count_frames','-show_streams','-show_format','-of','json',str(root/'flight.mp4')]))
video = next(s for s in meta['streams'] if s['codec_type']=='video')
audio = next(s for s in meta['streams'] if s['codec_type']=='audio')
assert (video['width'],video['height']) == (1920,1080)
assert video['avg_frame_rate'] == '60/1'
assert int(video['nb_read_frames']) == 720
assert audio['channels'] == 2 and audio['codec_name'] == 'aac'
assert abs(float(meta['format']['duration'])-12) < .1
run(['ffmpeg','-v','error','-nostdin','-i',str(root/'flight.mp4'),'-f','null','NUL'])
(root/'verification.json').write_text(json.dumps({'duration_seconds':float(meta['format']['duration']),'width':video['width'],'height':video['height'],'fps':60,'frames':720,'video_codec':video['codec_name'],'audio_codec':audio['codec_name'],'audio_channels':audio['channels'],'audio_sample_rate':audio['sample_rate'],'decode_errors':0,'bytes':(root/'flight.mp4').stat().st_size},indent=2))

print('Creating a lightweight motion preview...', flush=True)
run(['ffmpeg','-y','-nostdin','-v','error','-i',str(root/'flight.mp4'),'-filter_complex','[0:v]fps=12,scale=768:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3','-loop','0',str(root/'flight-preview.gif')])

print('Preparing a final sequence contact sheet...', flush=True)
sheet = Image.new('RGB',(1440,864),'#ecece8')
draw = ImageDraw.Draw(sheet)
for i,second in enumerate([.8,1.6,3,4.7,5.6,6.5,7.9,8.7,10.8]):
    target = root / f'check-{i}.png'
    run(['ffmpeg','-y','-nostdin','-v','error','-ss',str(second),'-i',str(root/'flight.mp4'),'-frames:v','1','-vf','scale=480:270',str(target)])
    image = Image.open(target).convert('RGB')
    x,y = (i%3)*480,(i//3)*288
    sheet.paste(image,(x,y))
    draw.text((x+10,y+274),f'{second:.1f}s',fill='#444444')
    target.unlink()
sheet.save(root/'sequence-review.jpg',quality=92)

with zipfile.ZipFile(root/'flight-source.zip','w',zipfile.ZIP_DEFLATED) as archive:
    for name in ['Flight.tsx','render.mjs','prepare.py','finish.py','README.md']:
        archive.write(root/name,name)
    for asset in (root/'public').iterdir():
        archive.write(asset, f'public/{asset.name}')
print(json.dumps({'status':'ready','video':str(root/'flight.mp4'),'preview':str(root/'flight-preview.gif'),'source':str(root/'flight-source.zip'),'verified_frames':720}), flush=True)
