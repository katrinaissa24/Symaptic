#!/usr/bin/env node
// Lighthouse for the landing page, My Maps and the editor (seeded with the perf maps in demo mode).
//   npx vite preview --port 4173 &  node scripts/lighthouse.mjs --label baseline
import { startFlow } from 'lighthouse';
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { seedStorage } from './seed.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => (a.startsWith('--') ? [a.slice(2), arr[i + 1] ?? 'true'] : [])).filter((x) => x.length));
const URL = args.url ?? 'http://localhost:4173';
const LABEL = args.label ?? 'run';
const EXE = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PAGES = [['landing', '/'], ['my-maps', '/app'], ['editor-100', '/d/perf-100']];

const browser = await puppeteer.launch({ executablePath: existsSync(EXE) ? EXE : undefined, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.goto(`${URL}/login`, { waitUntil: 'domcontentloaded' });
await page.evaluate((seed) => { for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v); localStorage.setItem('symaptic:onboarded', '1'); }, seedStorage([5, 100]));

const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'accessibility', 'best-practices'],
    formFactor: 'desktop',
    screenEmulation: { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false },
    throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 },
    throttlingMethod: 'simulate',
  },
};
const flow = await startFlow(page, { config, name: LABEL });
for (const [name, path] of PAGES) {
  process.stderr.write(`lighthouse ${name}…\n`);
  await page.bringToFront();
  await flow.navigate(`${URL}${path}`, { name });
}
const result = await flow.createFlowResult();
await browser.close();

mkdirSync('scripts/out', { recursive: true });
writeFileSync(`scripts/out/lh-${LABEL}.json`, JSON.stringify(result.steps.map((s) => ({ name: s.name, scores: Object.fromEntries(Object.entries(s.lhr.categories).map(([k, v]) => [k, v.score])), audits: Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index', 'interactive'].map((a) => [a, s.lhr.audits[a]?.numericValue])) })), null, 2));
const lines = [`# Lighthouse: ${LABEL}`, '', '| page | performance | accessibility | best practices | FCP | LCP | TBT | CLS | Speed Index |', '|---|---|---|---|---|---|---|---|---|'];
for (const s of result.steps) {
  const c = s.lhr.categories, a = s.lhr.audits;
  const ms = (k) => `${Math.round(a[k]?.numericValue ?? 0)} ms`;
  lines.push(`| ${s.name} | ${Math.round(c.performance.score * 100)} | ${Math.round(c.accessibility.score * 100)} | ${Math.round(c['best-practices'].score * 100)} | ${ms('first-contentful-paint')} | ${ms('largest-contentful-paint')} | ${ms('total-blocking-time')} | ${(a['cumulative-layout-shift']?.numericValue ?? 0).toFixed(3)} | ${ms('speed-index')} |`);
  if (s.lhr.runtimeError) lines.push(`|  | runtime error: ${s.lhr.runtimeError.code} ${s.lhr.runtimeError.message.slice(0, 200)} | | | | | | | |`);
  for (const w of s.lhr.runWarnings ?? []) lines.push(`|  | warning: ${String(w).slice(0, 200)} | | | | | | | |`);
  const fails = Object.values(a).filter((x) => x.score !== null && x.score < 0.9 && x.scoreDisplayMode === 'binary').map((x) => x.id);
  if (fails.length) lines.push(`|  | failing audits: ${fails.join(', ')} | | | | | | | |`);
}
writeFileSync(`scripts/out/lh-${LABEL}.md`, lines.join('\n') + '\n');
console.log(lines.join('\n'));
