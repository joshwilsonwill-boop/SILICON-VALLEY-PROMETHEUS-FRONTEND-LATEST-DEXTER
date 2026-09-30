import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = process.cwd();
const previewsDir = path.join(root, 'public', 'style-previews');
const peopleDir = path.join(root, 'public', 'library', 'people');

function getBase64Image(filename) {
  const filePath = path.join(peopleDir, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`Missing file: ${filePath}`);
    return '';
  }
  const ext = path.extname(filename).slice(1);
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`;
}

const noiseSvg = "data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E";

const configs = [
  {
    name: 'Alex Punchy',
    filenameBase: 'iman-1',
    formats: ['jpg', 'jfif'],
    html: (hormozi) => `
      <div class="bg-punchy"></div>
      <div class="grid-lines"></div>
      <div class="halo-punchy"></div>
      <div class="typography-layer">
        <div class="pill-punchy"><span class="dot-teal"></span>AGGRESSIVE PACING</div>
        <h1 class="title-punchy">PUNCHY <span class="badge-teal">PACE</span></h1>
        <p class="desc-punchy">High-velocity cuts, momentum rhythm & bold kinetic captions.</p>
        <div class="meta-tag">120 BPM CUT CADENCE • KINETIC IMPACT • B-ROLL BALANCED</div>
      </div>
      <img class="subject-punchy" src="${hormozi}" alt="Alex" />
      <div class="speed-streaks"></div>
      <div class="vignette-heavy"></div>
      <div class="film-grain"></div>
    `,
    styles: `
      .bg-punchy {
        position: absolute; inset: 0;
        background: radial-gradient(ellipse at 80% 40%, rgba(16, 185, 129, 0.18) 0%, transparent 55%),
                    radial-gradient(ellipse at 20% 80%, rgba(14, 116, 144, 0.35) 0%, transparent 60%),
                    linear-gradient(145deg, #0b0e14 0%, #040608 100%);
      }
      .grid-lines {
        position: absolute; inset: 0;
        background-image: linear-gradient(rgba(45, 212, 191, 0.05) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(45, 212, 191, 0.05) 1px, transparent 1px);
        background-size: 40px 40px;
        opacity: 0.8;
      }
      .halo-punchy {
        position: absolute; right: 160px; top: 80px; width: 540px; height: 540px; border-radius: 50%;
        background: radial-gradient(circle, rgba(20, 184, 166, 0.28) 0%, rgba(20, 184, 166, 0) 70%);
        filter: blur(50px); z-index: 2;
      }
      .typography-layer {
        position: absolute; left: 80px; top: 160px; z-index: 4; max-width: 600px;
      }
      .pill-punchy {
        display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px; border-radius: 9999px;
        background: rgba(45, 212, 191, 0.12); border: 1px solid rgba(45, 212, 191, 0.35);
        color: #2dd4bf; font-size: 13px; font-weight: 700; letter-spacing: 0.16em; margin-bottom: 20px;
      }
      .dot-teal { width: 6px; height: 6px; border-radius: 50%; background: #2dd4bf; box-shadow: 0 0 10px #2dd4bf; }
      .title-punchy {
        font-family: "Impact", "Archivo Black", "Arial Black", sans-serif;
        font-size: 82px; font-weight: 900; line-height: 0.95; letter-spacing: 0.02em; color: #ffffff;
        text-transform: uppercase;
      }
      .badge-teal {
        display: inline-block; background: #14b8a6; color: #022c22; padding: 0 14px;
        border-radius: 8px; transform: rotate(-2deg); box-shadow: 0 10px 30px rgba(20, 184, 166, 0.4);
      }
      .desc-punchy {
        margin-top: 24px; font-size: 21px; line-height: 1.45; color: rgba(255, 255, 255, 0.72);
        max-width: 480px; font-weight: 400;
      }
      .meta-tag {
        margin-top: 32px; font-size: 13px; color: rgba(45, 212, 191, 0.85); letter-spacing: 0.14em;
        font-family: monospace; font-weight: 600;
      }
      .subject-punchy {
        position: absolute; right: 20px; bottom: 0px; height: 680px; z-index: 5;
        filter: drop-shadow(0 25px 50px rgba(0,0,0,0.85)) contrast(1.08);
      }
      .speed-streaks {
        position: absolute; right: 260px; top: 180px; width: 320px; height: 6px;
        background: linear-gradient(90deg, transparent, #2dd4bf, transparent);
        transform: rotate(-15deg); opacity: 0.4; z-index: 3;
      }
    `,
  },
  {
    name: 'Alex Clean',
    filenameBase: 'iman-2',
    formats: ['jpg', 'jfif'],
    html: (iman) => `
      <div class="bg-clean"></div>
      <div class="clean-cyclorama"></div>
      <div class="typography-clean">
        <div class="pill-clean"><span class="dot-clean"></span>MINIMALIST DIRECTION</div>
        <h1 class="title-clean">Alex <span class="light-text">Clean</span></h1>
        <p class="desc-clean">Minimalist captions, crisp jump cuts, and premium sound design slots.</p>
        <div class="clean-chips">
          <span class="chip">CRISP JUMP CUTS</span>
          <span class="chip">PREMIUM SFX SLOTS</span>
          <span class="chip">ZERO CLUTTER</span>
        </div>
      </div>
      <img class="subject-clean" src="${iman}" alt="Alex Clean" />
      <div class="vignette-soft"></div>
      <div class="film-grain"></div>
    `,
    styles: `
      .bg-clean {
        position: absolute; inset: 0;
        background: radial-gradient(ellipse at 70% 30%, rgba(148, 163, 184, 0.15) 0%, transparent 60%),
                    linear-gradient(135deg, #181a20 0%, #0d0f14 100%);
      }
      .clean-cyclorama {
        position: absolute; right: 80px; top: 100px; width: 500px; height: 500px; border-radius: 50%;
        background: radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%);
        filter: blur(40px); z-index: 2;
      }
      .typography-clean {
        position: absolute; left: 80px; top: 160px; z-index: 4; max-width: 580px;
      }
      .pill-clean {
        display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 9999px;
        background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.16);
        color: #e2e8f0; font-size: 13px; font-weight: 600; letter-spacing: 0.16em; margin-bottom: 22px;
      }
      .dot-clean { width: 6px; height: 6px; border-radius: 50%; background: #38bdf8; box-shadow: 0 0 10px #38bdf8; }
      .title-clean {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 78px; font-weight: 800; line-height: 1.0; letter-spacing: -0.03em; color: #ffffff;
      }
      .light-text { font-weight: 300; color: #94a3b8; }
      .desc-clean {
        margin-top: 22px; font-size: 20px; line-height: 1.5; color: rgba(226, 232, 240, 0.72);
        max-width: 460px;
      }
      .clean-chips {
        margin-top: 32px; display: flex; flex-wrap: wrap; gap: 10px;
      }
      .chip {
        padding: 5px 12px; border-radius: 6px; background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1); color: #94a3b8; font-size: 12px;
        font-family: monospace; letter-spacing: 0.08em;
      }
      .subject-clean {
        position: absolute; right: 40px; bottom: 0px; height: 670px; z-index: 5;
        filter: drop-shadow(0 20px 45px rgba(0,0,0,0.75));
      }
    `,
  },
  {
    name: 'Dan Long Form Typography V1',
    filenameBase: 'podcast-1',
    formats: ['jpg', 'jfif'],
    html: (dan) => `
      <div class="bg-podcast"></div>
      <div class="slat-wall"></div>
      <div class="halo-podcast"></div>
      <div class="typography-podcast">
        <div class="pill-podcast"><span class="dot-amber"></span>LONG FORM MASTERY</div>
        <h1 class="title-podcast">Dan Long Form <span class="highlight-amber">Typography</span></h1>
        <p class="desc-podcast">Long-form SVG typography, highlight markers, and smart punch-ins.</p>
        <div class="telemetry-bar">
          <span class="rec-dot"></span>
          <span>01:42:19</span>
          <span>•</span>
          <span>AUDIO SYNC 48kHz</span>
          <span>•</span>
          <span>SVG KINETIC ENGINE</span>
        </div>
      </div>
      <img class="subject-podcast" src="${dan}" alt="Dan" />
      <div class="mic-silhouette"></div>
      <div class="vignette-heavy"></div>
      <div class="film-grain"></div>
    `,
    styles: `
      .bg-podcast {
        position: absolute; inset: 0;
        background: radial-gradient(ellipse at 75% 35%, rgba(245, 158, 11, 0.18) 0%, transparent 60%),
                    radial-gradient(ellipse at 20% 70%, rgba(30, 27, 75, 0.4) 0%, transparent 65%),
                    linear-gradient(135deg, #13111c 0%, #09080e 100%);
      }
      .slat-wall {
        position: absolute; inset: 0;
        background-image: repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.02) 0px, rgba(255, 255, 255, 0.02) 18px, transparent 18px, transparent 36px);
        opacity: 0.6;
      }
      .halo-podcast {
        position: absolute; right: 180px; top: 100px; width: 500px; height: 500px; border-radius: 50%;
        background: radial-gradient(circle, rgba(245, 158, 11, 0.22) 0%, transparent 70%);
        filter: blur(55px); z-index: 2;
      }
      .typography-podcast {
        position: absolute; left: 80px; top: 150px; z-index: 4; max-width: 620px;
      }
      .pill-podcast {
        display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 9999px;
        background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35);
        color: #fbbf24; font-size: 13px; font-weight: 700; letter-spacing: 0.16em; margin-bottom: 22px;
      }
      .dot-amber { width: 6px; height: 6px; border-radius: 50%; background: #f59e0b; box-shadow: 0 0 10px #f59e0b; }
      .title-podcast {
        font-family: Georgia, serif; font-size: 72px; font-weight: 700; line-height: 1.05;
        letter-spacing: -0.02em; color: #fffbeb;
      }
      .highlight-amber {
        color: #fbbf24; background: rgba(245, 158, 11, 0.18); padding: 0 10px; border-radius: 6px;
      }
      .desc-podcast {
        margin-top: 22px; font-size: 20px; line-height: 1.5; color: rgba(254, 243, 199, 0.75);
        max-width: 480px;
      }
      .telemetry-bar {
        margin-top: 34px; display: flex; align-items: center; gap: 14px; font-size: 13px;
        color: rgba(251, 191, 36, 0.9); font-family: monospace; letter-spacing: 0.12em; font-weight: 600;
      }
      .rec-dot { width: 8px; height: 8px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 12px #ef4444; }
      .subject-podcast {
        position: absolute; right: 50px; bottom: 0px; height: 660px; z-index: 5;
        filter: drop-shadow(0 20px 45px rgba(0,0,0,0.85));
      }
      .mic-silhouette {
        position: absolute; right: 280px; bottom: 30px; width: 140px; height: 260px;
        background: radial-gradient(ellipse at center, rgba(30, 30, 40, 0.6) 0%, transparent 70%);
        border-radius: 20px; border: 2px solid rgba(255, 255, 255, 0.08); z-index: 6;
        filter: blur(1px); transform: rotate(18deg); opacity: 0.5;
      }
    `,
  },
  {
    name: 'Reels Heat',
    filenameBase: 'reels-heat-1',
    formats: ['webp'],
    html: (codie) => `
      <div class="bg-reels"></div>
      <div class="neon-burst"></div>
      <div class="typography-reels">
        <div class="pill-reels"><span class="dot-pink"></span>MAX RETENTION HOOK</div>
        <h1 class="title-reels">REELS <span class="badge-fire">HEAT</span></h1>
        <p class="desc-reels">Fast hook, high energy cuts, and high-velocity b-roll overlays.</p>
        <div class="stats-grid">
          <div class="stat-box"><span class="stat-val">3.2x</span><span class="stat-lbl">Hook Rate</span></div>
          <div class="stat-box"><span class="stat-val">84%</span><span class="stat-lbl">Completion</span></div>
          <div class="stat-box"><span class="stat-val">HOT</span><span class="stat-lbl">Pacing</span></div>
        </div>
      </div>
      <img class="subject-reels" src="${codie}" alt="Codie" />
      <div class="vignette-heavy"></div>
      <div class="film-grain"></div>
    `,
    styles: `
      .bg-reels {
        position: absolute; inset: 0;
        background: radial-gradient(ellipse at 85% 45%, rgba(244, 63, 94, 0.28) 0%, transparent 55%),
                    radial-gradient(ellipse at 25% 75%, rgba(139, 92, 246, 0.35) 0%, transparent 60%),
                    linear-gradient(135deg, #130a1c 0%, #060408 100%);
      }
      .neon-burst {
        position: absolute; right: 180px; top: 120px; width: 480px; height: 480px; border-radius: 50%;
        background: radial-gradient(circle, rgba(236, 72, 153, 0.25) 0%, transparent 70%);
        filter: blur(50px); z-index: 2;
      }
      .typography-reels {
        position: absolute; left: 80px; top: 140px; z-index: 4; max-width: 600px;
      }
      .pill-reels {
        display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 9999px;
        background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.4);
        color: #fb7185; font-size: 13px; font-weight: 700; letter-spacing: 0.16em; margin-bottom: 20px;
      }
      .dot-pink { width: 6px; height: 6px; border-radius: 50%; background: #f43f5e; box-shadow: 0 0 10px #f43f5e; }
      .title-reels {
        font-family: "Impact", "Arial Black", sans-serif; font-size: 88px; font-weight: 900;
        line-height: 0.95; letter-spacing: 0.02em; color: #ffffff; text-transform: uppercase;
      }
      .badge-fire {
        display: inline-block; background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
        color: #ffffff; padding: 0 16px; border-radius: 10px; transform: rotate(-3deg);
        box-shadow: 0 12px 35px rgba(244, 63, 94, 0.5);
      }
      .desc-reels {
        margin-top: 24px; font-size: 21px; line-height: 1.45; color: rgba(255, 255, 255, 0.75);
        max-width: 480px;
      }
      .stats-grid {
        margin-top: 30px; display: flex; gap: 16px;
      }
      .stat-box {
        background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.12);
        padding: 10px 18px; border-radius: 10px; display: flex; flex-direction: column; gap: 2px;
      }
      .stat-val { font-size: 22px; font-weight: 800; color: #fb7185; font-family: monospace; }
      .stat-lbl { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255, 255, 255, 0.5); }
      .subject-reels {
        position: absolute; right: 30px; bottom: 0px; height: 670px; z-index: 5;
        filter: drop-shadow(0 25px 50px rgba(0,0,0,0.85)) contrast(1.1);
      }
    `,
  },
  {
    name: 'Reels Heat Alt',
    filenameBase: 'reels-heat-2',
    formats: ['webp'],
    html: (codie) => `
      <div class="bg-reels-alt"></div>
      <div class="typography-reels">
        <div class="pill-reels"><span class="dot-pink"></span>SHORT-FORM VELOCITY</div>
        <h1 class="title-reels">FAST <span class="badge-fire">HOOK</span></h1>
        <p class="desc-reels">Aggressive visual hooks and high-energy pacing designed for retention.</p>
        <div class="stats-grid">
          <div class="stat-box"><span class="stat-val">TOP 1%</span><span class="stat-lbl">CTR Potential</span></div>
          <div class="stat-box"><span class="stat-val">DYNAMIC</span><span class="stat-lbl">Overlays</span></div>
        </div>
      </div>
      <img class="subject-reels" src="${codie}" alt="Codie" />
      <div class="vignette-heavy"></div>
      <div class="film-grain"></div>
    `,
    styles: `
      .bg-reels-alt {
        position: absolute; inset: 0;
        background: radial-gradient(ellipse at 80% 35%, rgba(225, 29, 72, 0.3) 0%, transparent 55%),
                    linear-gradient(135deg, #180918 0%, #080309 100%);
      }
      .typography-reels {
        position: absolute; left: 80px; top: 150px; z-index: 4; max-width: 600px;
      }
      .pill-reels {
        display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 9999px;
        background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.4);
        color: #fb7185; font-size: 13px; font-weight: 700; letter-spacing: 0.16em; margin-bottom: 20px;
      }
      .dot-pink { width: 6px; height: 6px; border-radius: 50%; background: #f43f5e; box-shadow: 0 0 10px #f43f5e; }
      .title-reels {
        font-family: "Impact", "Arial Black", sans-serif; font-size: 88px; font-weight: 900;
        line-height: 0.95; letter-spacing: 0.02em; color: #ffffff; text-transform: uppercase;
      }
      .badge-fire {
        display: inline-block; background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
        color: #ffffff; padding: 0 16px; border-radius: 10px; transform: rotate(-3deg);
        box-shadow: 0 12px 35px rgba(244, 63, 94, 0.5);
      }
      .desc-reels {
        margin-top: 24px; font-size: 21px; line-height: 1.45; color: rgba(255, 255, 255, 0.75);
        max-width: 480px;
      }
      .stats-grid { margin-top: 30px; display: flex; gap: 16px; }
      .stat-box {
        background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.12);
        padding: 10px 18px; border-radius: 10px; display: flex; flex-direction: column; gap: 2px;
      }
      .stat-val { font-size: 22px; font-weight: 800; color: #fb7185; font-family: monospace; }
      .stat-lbl { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255, 255, 255, 0.5); }
      .subject-reels {
        position: absolute; right: 30px; bottom: 0px; height: 670px; z-index: 5;
        filter: drop-shadow(0 25px 50px rgba(0,0,0,0.85)) contrast(1.1);
      }
    `,
  },
  {
    name: 'Cinematic Noir',
    filenameBase: 'dark-cinematic-1',
    formats: ['jpg', 'jfif'],
    html: (ray) => `
      <div class="bg-noir"></div>
      <div class="halo-noir"></div>
      <div class="anamorphic-streak"></div>
      <div class="typography-noir">
        <div class="pill-noir"><span class="dot-noir"></span>NEO-NOIR THRILLER</div>
        <h1 class="title-noir">CINEMATIC <span class="light-noir">NOIR</span></h1>
        <p class="desc-noir">Moody contrast, deep chiaroscuro shadows, and slow-burn pacing.</p>
        <div class="meta-noir">
          <span>HIGH CONTRAST CHIAROSCURO</span>
          <span>•</span>
          <span>RESTRAINED CAPTIONS</span>
          <span>•</span>
          <span>35MM OBSIDIAN</span>
        </div>
      </div>
      <img class="subject-noir" src="${ray}" alt="Noir Figure" />
      <div class="vignette-ultra"></div>
      <div class="bars-cinema"><div class="bar-cin"></div><div class="bar-cin"></div></div>
      <div class="film-grain"></div>
    `,
    styles: `
      .bg-noir {
        position: absolute; inset: 0;
        background: radial-gradient(ellipse at 75% 35%, rgba(56, 189, 248, 0.12) 0%, transparent 55%),
                    linear-gradient(135deg, #07090e 0%, #020204 100%);
      }
      .halo-noir {
        position: absolute; right: 140px; top: 120px; width: 500px; height: 500px; border-radius: 50%;
        background: radial-gradient(circle, rgba(56, 189, 248, 0.16) 0%, transparent 65%);
        filter: blur(50px); z-index: 2;
      }
      .anamorphic-streak {
        position: absolute; left: 0; top: 380px; width: 100%; height: 2px;
        background: linear-gradient(90deg, transparent 0%, rgba(56, 189, 248, 0.4) 50%, transparent 100%);
        box-shadow: 0 0 16px rgba(56, 189, 248, 0.5); z-index: 3;
      }
      .typography-noir {
        position: absolute; left: 80px; top: 160px; z-index: 4; max-width: 600px;
      }
      .pill-noir {
        display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 9999px;
        background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.28);
        color: #7dd3fc; font-size: 13px; font-weight: 600; letter-spacing: 0.18em; margin-bottom: 24px;
      }
      .dot-noir { width: 6px; height: 6px; border-radius: 50%; background: #38bdf8; box-shadow: 0 0 10px #38bdf8; }
      .title-noir {
        font-family: Georgia, "Times New Roman", serif; font-size: 74px; font-weight: 700; line-height: 1.05;
        letter-spacing: 0.04em; color: #f8fafc;
      }
      .light-noir { font-weight: 300; color: #7dd3fc; font-style: italic; }
      .desc-noir {
        margin-top: 22px; font-size: 20px; line-height: 1.5; color: rgba(203, 213, 225, 0.65); max-width: 480px;
      }
      .meta-noir {
        margin-top: 36px; display: flex; align-items: center; gap: 20px; font-size: 12px;
        color: rgba(125, 211, 252, 0.6); font-family: monospace; letter-spacing: 0.14em;
      }
      .subject-noir {
        position: absolute; right: 40px; bottom: 30px; height: 650px; z-index: 5;
        filter: drop-shadow(0 20px 45px rgba(0,0,0,0.9)) grayscale(0.65) contrast(1.25) brightness(0.92);
      }
      .vignette-ultra {
        position: absolute; inset: 0; box-shadow: inset 0 0 200px rgba(0,0,0,0.92);
        pointer-events: none; z-index: 10;
      }
      .bars-cinema {
        position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between;
        pointer-events: none; z-index: 12;
      }
      .bar-cin { height: 34px; background: #000; }
    `,
  },
  {
    name: 'Stoic Red',
    filenameBase: 'red-statue-1',
    formats: ['jpg', 'jfif'],
    html: (ray) => `
      <div class="bg-stoic"></div>
      <div class="crimson-glow"></div>
      <div class="typography-stoic">
        <div class="pill-stoic"><span class="dot-crimson"></span>CLASSICAL DISCIPLINE</div>
        <h1 class="title-stoic">STOIC <span class="highlight-crimson">RED</span></h1>
        <p class="desc-stoic">Bold accents, confident pacing, and minimal distractions.</p>
        <div class="latin-quote">“AMOR FATI • MEMENTO MORI • RATIO CONSTANS”</div>
      </div>
      <img class="subject-stoic" src="${ray}" alt="Stoic Statue" />
      <div class="vignette-heavy"></div>
      <div class="film-grain"></div>
    `,
    styles: `
      .bg-stoic {
        position: absolute; inset: 0;
        background: radial-gradient(ellipse at 80% 40%, rgba(220, 38, 38, 0.28) 0%, transparent 60%),
                    linear-gradient(135deg, #180808 0%, #080303 100%);
      }
      .crimson-glow {
        position: absolute; right: 160px; top: 100px; width: 520px; height: 520px; border-radius: 50%;
        background: radial-gradient(circle, rgba(239, 68, 68, 0.24) 0%, transparent 65%);
        filter: blur(55px); z-index: 2;
      }
      .typography-stoic {
        position: absolute; left: 80px; top: 160px; z-index: 4; max-width: 600px;
      }
      .pill-stoic {
        display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 9999px;
        background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35);
        color: #f87171; font-size: 13px; font-weight: 700; letter-spacing: 0.18em; margin-bottom: 22px;
      }
      .dot-crimson { width: 6px; height: 6px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 10px #ef4444; }
      .title-stoic {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 82px; font-weight: 900; line-height: 1.0; letter-spacing: 0.02em; color: #ffffff;
      }
      .highlight-crimson {
        background: #dc2626; color: #ffffff; padding: 0 16px; border-radius: 8px;
        box-shadow: 0 10px 30px rgba(220, 38, 38, 0.45);
      }
      .desc-stoic {
        margin-top: 24px; font-size: 20px; line-height: 1.5; color: rgba(254, 202, 202, 0.72); max-width: 480px;
      }
      .latin-quote {
        margin-top: 36px; font-size: 13px; color: #f87171; font-family: monospace; letter-spacing: 0.16em; font-weight: 600;
      }
      .subject-stoic {
        position: absolute; right: 30px; bottom: 0px; height: 670px; z-index: 5;
        filter: drop-shadow(0 20px 45px rgba(0,0,0,0.9)) grayscale(0.85) sepia(0.3) hue-rotate(320deg) contrast(1.2);
      }
    `,
  },
  {
    name: 'Minimal Subtle',
    filenameBase: 'minimal-subtle-1',
    formats: ['jpg'],
    html: (dean) => `
      <div class="bg-subtle"></div>
      <div class="typography-subtle">
        <div class="pill-subtle"><span class="dot-subtle"></span>BRAND-FIRST EDITORIAL</div>
        <h1 class="title-subtle">Minimal <span class="light-subtle">Subtle</span></h1>
        <p class="desc-subtle">Bare captions and clean cuts for brand-first, sophisticated content.</p>
        <div class="line-divider"></div>
        <div class="swiss-meta">SWISS TYPOGRAPHIC DISCIPLINE • MONOCHROME PURITY • RESTFUL BREATHING ROOM</div>
      </div>
      <img class="subject-subtle" src="${dean}" alt="Dean" />
      <div class="vignette-soft"></div>
      <div class="film-grain"></div>
    `,
    styles: `
      .bg-subtle {
        position: absolute; inset: 0;
        background: radial-gradient(ellipse at 70% 30%, rgba(232, 225, 210, 0.08) 0%, transparent 60%),
                    linear-gradient(135deg, #16181d 0%, #0d0e12 100%);
      }
      .typography-subtle {
        position: absolute; left: 80px; top: 160px; z-index: 4; max-width: 600px;
      }
      .pill-subtle {
        display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 9999px;
        background: rgba(232, 225, 210, 0.08); border: 1px solid rgba(232, 225, 210, 0.22);
        color: #e8e1d2; font-size: 13px; font-weight: 600; letter-spacing: 0.16em; margin-bottom: 22px;
      }
      .dot-subtle { width: 6px; height: 6px; border-radius: 50%; background: #e8e1d2; box-shadow: 0 0 10px #e8e1d2; }
      .title-subtle {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 78px; font-weight: 700; line-height: 1.0; letter-spacing: -0.02em; color: #f5f2eb;
      }
      .light-subtle { font-weight: 300; color: #a3a099; }
      .desc-subtle {
        margin-top: 22px; font-size: 20px; line-height: 1.5; color: rgba(232, 225, 210, 0.65); max-width: 480px;
      }
      .line-divider {
        width: 140px; height: 1px; background: rgba(232, 225, 210, 0.25); margin-top: 28px;
      }
      .swiss-meta {
        margin-top: 24px; font-size: 12px; color: rgba(232, 225, 210, 0.45); font-family: monospace; letter-spacing: 0.12em;
      }
      .subject-subtle {
        position: absolute; right: 40px; bottom: 0px; height: 670px; z-index: 5;
        filter: drop-shadow(0 20px 45px rgba(0,0,0,0.8)) contrast(1.05);
      }
    `,
  },
];

async function main() {
  console.log('Loading source character portraits from public/library/people...');
  const hormozi = getBase64Image('hormozi.png');
  const iman = getBase64Image('iman-gadzhi.png');
  const dan = getBase64Image('dan-martell.png');
  const codie = getBase64Image('codie-sanchez.png');
  const ray = getBase64Image('ray-dalio.png');
  const dean = getBase64Image('dean-graziosi.png');

  const subjects = {
    'iman-1': hormozi,
    'iman-2': iman,
    'podcast-1': dan,
    'reels-heat-1': codie,
    'reels-heat-2': codie,
    'dark-cinematic-1': ray,
    'red-statue-1': ray,
    'minimal-subtle-1': dean,
  };

  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  for (const config of configs) {
    const subjectImg = subjects[config.filenameBase];
    const pageHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1280px; height: 720px; background: #000; overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    position: relative; color: #fff;
  }
  .vignette-heavy {
    position: absolute; inset: 0; box-shadow: inset 0 0 160px rgba(0,0,0,0.85); pointer-events: none; z-index: 10;
  }
  .vignette-soft {
    position: absolute; inset: 0; box-shadow: inset 0 0 120px rgba(0,0,0,0.65); pointer-events: none; z-index: 10;
  }
  .film-grain {
    position: absolute; inset: 0; z-index: 15; pointer-events: none; opacity: 0.04;
    background-image: url("${noiseSvg}");
  }
  ${config.styles}
</style>
</head>
<body>
  ${config.html(subjectImg)}
</body>
</html>`;

    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.setContent(pageHtml);
    await page.waitForTimeout(300);

    for (const format of config.formats) {
      const ext = format === 'jfif' ? 'jfif' : format === 'webp' ? 'webp' : 'jpg';
      const outPath = path.join(previewsDir, `${config.filenameBase}.${ext}`);
      const screenshotType = format === 'webp' ? 'png' : 'jpeg';
      const buffer = await page.screenshot({ type: screenshotType, quality: format === 'webp' ? undefined : 95 });
      fs.writeFileSync(outPath, buffer);
      console.log(`Generated: ${config.filenameBase}.${ext} (${buffer.length} bytes)`);
    }

    await page.close();
  }

  await browser.close();
  console.log('All cinematic style previews generated successfully!');
}

main().catch(console.error);
