// Renders src/scene.html frame-by-frame with headless Chromium.
//   node scripts/render.cjs <outDir>                 -> all frames as f00000.jpg ...
//   node scripts/render.cjs <outDir> --at 1.2,5,9.5  -> preview PNGs at given seconds
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const tlSrc = fs.readFileSync(path.join(ROOT, 'src/timeline.js'), 'utf8');
const TL = JSON.parse(tlSrc.slice(tlSrc.indexOf('{'), tlSrc.lastIndexOf('}') + 1));

const outDir = process.argv[2] || path.join(ROOT, 'build/frames');
const atIdx = process.argv.indexOf('--at');
const preview = atIdx > 0 ? process.argv[atIdx + 1].split(',').map(Number) : null;
const WORKERS = Number(process.env.WORKERS || 4);

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch(
    fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const url = 'file://' + path.join(ROOT, 'src/scene.html');
  const total = Math.round(TL.fps * TL.duration);
  const jobs = preview ? preview.map(t => ({ t, file: `preview_${t.toFixed(2)}.png` }))
    : Array.from({ length: total }, (_, f) => ({ t: f / TL.fps, file: `f${String(f).padStart(5, '0')}.jpg` }));

  let done = 0;
  await Promise.all(Array.from({ length: Math.min(WORKERS, jobs.length) }, async (_, w) => {
    const page = await browser.newPage({ viewport: { width: TL.width, height: TL.height } });
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    for (let i = w; i < jobs.length; i += WORKERS) {
      const { t, file } = jobs[i];
      await page.evaluate(t => window.render(t), t);
      const opts = { path: path.join(outDir, file) };
      if (file.endsWith('.jpg')) Object.assign(opts, { type: 'jpeg', quality: 95 });
      await page.screenshot(opts);
      if (++done % 60 === 0) process.stdout.write(`  ${done}/${jobs.length} frames\n`);
    }
    await page.close();
  }));
  await browser.close();
  console.log(`rendered ${jobs.length} image(s) -> ${outDir}`);
})().catch(e => { console.error(e); process.exit(1); });
