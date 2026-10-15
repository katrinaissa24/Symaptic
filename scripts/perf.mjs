#!/usr/bin/env node
// Frame-time / render-count / typing-latency harness for the map editor.
//
//   npm run build && npx vite preview --port 4173 &
//   node scripts/perf.mjs --sizes 5,100,500 --label baseline
//
// Drives headless Chromium with Playwright. For each map size it pans, zooms and drags, recording
// requestAnimationFrame deltas (frame time), IdeaNode render counts (window.__PERF__) and keyboard
// Event Timing durations (typing latency). Results land in scripts/out/<label>.json and .md.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { seedStorage } from './seed.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => (a.startsWith('--') ? [a.slice(2), arr[i + 1] ?? 'true'] : [])).filter((x) => x.length));
const URL = args.url ?? 'http://localhost:4173';
const SIZES = (args.sizes ?? '5,100,500').split(',').map(Number);
const LABEL = args.label ?? 'run';
const EXE = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const stats = (arr) => {
  if (!arr.length) return { n: 0, mean: 0, p95: 0, max: 0, over16: 0 };
  const s = [...arr].sort((a, b) => a - b);
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  return {
    n: s.length,
    mean: +mean.toFixed(2),
    p95: +s[Math.min(s.length - 1, Math.floor(s.length * 0.95))].toFixed(2),
    max: +s[s.length - 1].toFixed(2),
    over20: +((s.filter((x) => x > 20).length / s.length) * 100).toFixed(0),
  };
};

const frame = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Buckets the Chrome trace like the Performance panel does (ms of main/raster work inside the gesture).
function traceBuckets(buf) {
  let events = [];
  try { events = JSON.parse(buf.toString()).traceEvents ?? []; } catch { return null; }
  const B = { script: 0, style: 0, layout: 0, paint: 0, raster: 0, composite: 0 };
  const map = { FunctionCall: 'script', EvaluateScript: 'script', UpdateLayoutTree: 'style', Layout: 'layout', PrePaint: 'paint', Paint: 'paint', RasterTask: 'raster', Commit: 'composite', CompositeLayers: 'composite', UpdateLayer: 'composite' };
  for (const e of events) if (e.ph === 'X' && map[e.name]) B[map[e.name]] += (e.dur ?? 0) / 1000;
  for (const k in B) B[k] = +B[k].toFixed(0);
  return B;
}

async function gesture(page, browser, name, run) {
  await browser.startTracing(page, { screenshots: false, categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame'] });
  await page.evaluate(() => { const P = window.__PERF__; P.frames = []; P.renders = {}; P.events = []; P.recording = true; P.t0 = performance.now(); });
  await frame(page);
  await run();
  await frame(page);
  const r = await page.evaluate(() => { const P = window.__PERF__; P.recording = false; return { wall: performance.now() - P.t0, frames: P.frames.slice(1), renders: P.renders, inputs: P.events.filter((e) => e.name === 'pointermove' || e.name === 'mousemove' || e.name === 'wheel').map((e) => e.duration) }; });
  const trace = traceBuckets(await browser.stopTracing());
  return { name, wallMs: Math.round(r.wall), frames: stats(r.frames), inputLatency: stats(r.inputs), trace, renders: r.renders };
}

// Realistic input: pointer moves at ~250 Hz without waiting for frames, so slow frames show up as long rAF deltas.
async function dragFrom(page, x, y, dx, dy, segments = 40) {
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= segments; i++) { await page.mouse.move(x + (dx * i) / segments, y + (dy * i) / segments, { steps: 4 }); await sleep(4); }
  await page.mouse.up();
}

async function emptySpot(page) {
  return page.evaluate(() => {
    const pane = document.querySelector('.react-flow__pane').getBoundingClientRect();
    const cx = pane.left + pane.width / 2, cy = pane.top + pane.height / 2;
    for (let r = 0; r < 400; r += 20) for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      const el = document.elementFromPoint(x, y);
      if (el && el.classList.contains('react-flow__pane')) return { x, y };
    }
    return { x: cx, y: cy };
  });
}
async function visibleIdea(page) {
  return page.evaluate(() => {
    const vw = innerWidth, vh = innerHeight;
    const nodes = [...document.querySelectorAll('.react-flow__node-idea')];
    for (const el of nodes.slice(1)) {
      const b = el.getBoundingClientRect();
      if (b.left > 20 && b.top > 80 && b.right < vw - 300 && b.bottom < vh - 100 && b.width > 10) {
        const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        if (hit && el.contains(hit)) return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height };
      }
    }
    const b = nodes[0].getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height };
  });
}

async function measure(page, browser, n) {
  const t0 = Date.now();
  await page.goto(`${URL}/d/perf-${n}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.react-flow__node', { timeout: 30000 });
  const firstNode = Date.now() - t0;
  await page.waitForTimeout(900);
  const nav = await page.evaluate(() => {
    const t = performance.getEntriesByType('navigation')[0];
    return { domContentLoaded: Math.round(t.domContentLoadedEventEnd), load: Math.round(t.loadEventEnd), transferKb: Math.round(performance.getEntriesByType('resource').reduce((a, r) => a + (r.transferSize || 0), 0) / 1024) };
  });
  const domCount = await page.evaluate(() => document.querySelectorAll('*').length);
  const renderedNodes = await page.locator('.react-flow__node').count();

  const results = [];
  const spot = await emptySpot(page);
  results.push(await gesture(page, browser, 'pan', () => dragFrom(page, spot.x, spot.y, 240, -120)));
  results.push(await gesture(page, browser, 'zoom', async () => {
    await page.mouse.move(spot.x, spot.y);
    for (let i = 0; i < 30; i++) { await page.mouse.wheel(0, -40); await sleep(8); }
    for (let i = 0; i < 30; i++) { await page.mouse.wheel(0, 40); await sleep(8); }
  }));
  const idea = await visibleIdea(page);
  results.push(await gesture(page, browser, 'drag', () => dragFrom(page, idea.x, idea.y, 160, 90)));
  await page.waitForTimeout(400);

  // TYPING: double-click an idea, type, read Event Timing durations (input → next paint) for keydown.
  const idea2 = await visibleIdea(page);
  await page.evaluate(() => { window.__PERF__.events = []; });
  await page.mouse.dblclick(idea2.x, idea2.y);
  let typing;
  try {
    const editor = page.locator('.react-flow__node textarea, .react-flow__node [contenteditable="true"], .react-flow__node input').first();
    await editor.waitFor({ timeout: 3000 });
    await page.keyboard.press('End');
    await page.keyboard.type(' latency check here', { delay: 70 });
    await page.waitForTimeout(400);
    typing = stats(await page.evaluate(() => window.__PERF__.events.filter((e) => e.name === 'keydown').map((e) => e.duration)));
    await page.keyboard.press('Escape');
  } catch {
    typing = { error: 'no editor opened' };
  }
  return { n, renderedNodes, domCount, firstNodeMs: firstNode, nav, gestures: results, typing };
}

async function main() {
  const browser = await chromium.launch({ executablePath: existsSync(EXE) ? EXE : undefined, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const seed = seedStorage(SIZES);
  await ctx.addInitScript((seed) => {
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
    localStorage.setItem('symaptic:onboarded', '1');
    const P = (window.__PERF__ = { frames: [], renders: {}, events: [], recording: false, count(name) { if (P.recording) P.renders[name] = (P.renders[name] || 0) + 1; } });
    let last = performance.now();
    const loop = (t) => { if (P.recording) P.frames.push(t - last); last = t; requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    try {
      new PerformanceObserver((list) => { for (const e of list.getEntries()) P.events.push({ name: e.name, duration: e.duration }); }).observe({ type: 'event', durationThreshold: 16, buffered: true });
    } catch {}
  }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('page error:', e.message));

  const out = { label: LABEL, date: new Date().toISOString(), url: URL, sizes: [] };
  for (const n of SIZES) {
    process.stderr.write(`measuring ${n} nodes…\n`);
    out.sizes.push(await measure(page, browser, n));
  }
  await browser.close();

  if (existsSync('dist/assets')) {
    out.bundle = readdirSync('dist/assets').map((f) => ({ file: f, kb: +(statSync(`dist/assets/${f}`).size / 1024).toFixed(1) })).sort((a, b) => b.kb - a.kb);
  }

  mkdirSync('scripts/out', { recursive: true });
  writeFileSync(`scripts/out/${LABEL}.json`, JSON.stringify(out, null, 2));
  const lines = [`# Perf: ${LABEL} (${out.date})`, '', '| nodes | gesture | frame mean | frame p95 | frame max | frames >20ms | input→paint p95 | script | style | layout | paint | raster | IdeaNode renders |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const s of out.sizes) for (const g of s.gestures) lines.push(`| ${s.n} | ${g.name} | ${g.frames.mean} | ${g.frames.p95} | ${g.frames.max} | ${g.frames.over20}% | ${g.inputLatency.n ? g.inputLatency.p95 : '<16'} | ${g.trace?.script ?? '–'} | ${g.trace?.style ?? '–'} | ${g.trace?.layout ?? '–'} | ${g.trace?.paint ?? '–'} | ${g.trace?.raster ?? '–'} | ${g.renders.IdeaNode ?? 0} |`);
  lines.push('', 'Frame times in ms from requestAnimationFrame deltas; script/style/layout/paint/raster are total ms of trace work during the gesture (~1 s of input).');
  lines.push('', '| nodes | typing mean ms | typing p95 ms | first node ms | DOMContentLoaded ms | DOM elements | rendered nodes |', '|---|---|---|---|---|---|---|');
  for (const s of out.sizes) lines.push(`| ${s.n} | ${s.typing?.mean ?? '–'} | ${s.typing?.p95 ?? '–'} | ${s.firstNodeMs} | ${s.nav.domContentLoaded} | ${s.domCount} | ${s.renderedNodes} |`);
  if (out.bundle) { lines.push('', '| bundle file | kB |', '|---|---|'); for (const b of out.bundle) lines.push(`| ${b.file} | ${b.kb} |`); }
  writeFileSync(`scripts/out/${LABEL}.md`, lines.join('\n') + '\n');
  console.log(lines.join('\n'));
}

main().catch((e) => { console.error(e); process.exit(1); });
