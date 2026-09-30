import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

async function generate() {
  const root = process.cwd();
  const rayDalioPath = path.join(root, 'public', 'library', 'people', 'ray-dalio.png');
  const rayDalioBase64 = `data:image/png;base64,${fs.readFileSync(rayDalioPath).toString('base64')}`;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1280px;
    height: 720px;
    background: #090a0d;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, serif;
    position: relative;
    color: #fff;
  }
  .bg-grad {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 75% 35%, rgba(180, 140, 90, 0.22) 0%, transparent 60%),
      radial-gradient(ellipse at 25% 75%, rgba(20, 35, 55, 0.45) 0%, transparent 65%),
      linear-gradient(135deg, #0d0e12 0%, #060709 100%);
  }
  .vignette {
    position: absolute;
    inset: 0;
    box-shadow: inset 0 0 160px rgba(0,0,0,0.85);
    pointer-events: none;
    z-index: 10;
  }
  .bars {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    pointer-events: none;
    z-index: 12;
  }
  .bar {
    height: 38px;
    background: #000;
  }
  .subject {
    position: absolute;
    right: 40px;
    bottom: 30px;
    height: 640px;
    z-index: 4;
    filter: drop-shadow(0 20px 40px rgba(0,0,0,0.7));
  }
  .halo {
    position: absolute;
    right: 180px;
    top: 120px;
    width: 480px;
    height: 480px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(220, 180, 120, 0.18) 0%, rgba(220, 180, 120, 0) 70%);
    z-index: 2;
    filter: blur(40px);
  }
  .typography-bg {
    position: absolute;
    left: 80px;
    top: 150px;
    z-index: 3;
    max-width: 620px;
  }
  .category-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    border-radius: 9999px;
    background: rgba(220, 180, 120, 0.12);
    border: 1px solid rgba(220, 180, 120, 0.28);
    color: #e5c898;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    margin-bottom: 24px;
  }
  .pill-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #e5c898;
    box-shadow: 0 0 10px #e5c898;
  }
  .main-title {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 76px;
    font-weight: 700;
    line-height: 1.05;
    letter-spacing: -0.02em;
    color: #f7f4ed;
    text-shadow: 0 4px 24px rgba(0,0,0,0.6);
  }
  .highlight {
    color: #e5c898;
    font-style: italic;
  }
  .subtitle {
    margin-top: 20px;
    font-size: 20px;
    line-height: 1.5;
    color: rgba(247, 244, 237, 0.65);
    max-width: 480px;
    letter-spacing: 0.01em;
  }
  .meta-footer {
    margin-top: 36px;
    display: flex;
    align-items: center;
    gap: 24px;
    font-size: 13px;
    color: rgba(255,255,255,0.4);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-family: monospace;
  }
  .grain {
    position: absolute;
    inset: 0;
    z-index: 15;
    pointer-events: none;
    opacity: 0.035;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  }
</style>
</head>
<body>
  <div class="bg-grad"></div>
  <div class="halo"></div>
  <div class="typography-bg">
    <div class="category-pill">
      <span class="pill-dot"></span>
      Cinematic Masterclass
    </div>
    <h1 class="main-title">Docs <span class="highlight">Story</span></h1>
    <p class="subtitle">Breathing room, cinematic 35mm pacing, and tasteful documentary captions.</p>
    <div class="meta-footer">
      <span>2.39:1 ANAMORPHIC</span>
      <span>•</span>
      <span>35MM NATURAL TONE</span>
      <span>•</span>
      <span>24 FPS</span>
    </div>
  </div>
  <img class="subject" src="${rayDalioBase64}" alt="Speaker" />
  <div class="vignette"></div>
  <div class="bars">
    <div class="bar"></div>
    <div class="bar"></div>
  </div>
  <div class="grain"></div>
</body>
</html>`;

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.setContent(html);
  // Wait slightly for image decode
  await page.waitForTimeout(300);

  const outputPathJpg = path.join(root, 'public', 'style-previews', 'docs-story-1.jpg');
  const outputPathJfif = path.join(root, 'public', 'style-previews', 'docs-story-1.jfif');

  const buffer = await page.screenshot({ type: 'jpeg', quality: 95 });
  fs.writeFileSync(outputPathJpg, buffer);
  fs.writeFileSync(outputPathJfif, buffer);
  await browser.close();

  console.log('Generated docs-story-1.jpg, bytes:', buffer.length);
}

generate().catch(console.error);
