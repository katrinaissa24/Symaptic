#!/usr/bin/env node
// Screenshots of key screens (seeded demo mode). node scripts/shot.mjs --label phase1 [--dark] [--width 1440]
import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';
import { seedStorage } from './seed.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => (a.startsWith('--') ? [a.slice(2), arr[i + 1]?.startsWith('--') ? 'true' : (arr[i + 1] ?? 'true')] : [])).filter((x) => x.length));
const URL = args.url ?? 'http://localhost:4173';
const LABEL = args.label ?? 'shot';
const EXE = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const width = +(args.width ?? 1440), height = +(args.height ?? 900);
const pages = (args.pages ?? 'landing:/,login:/login,maps:/app,editor:/d/perf-5,editor100:/d/perf-100').split(',').map((p) => p.split(':'));

const browser = await chromium.launch({ executablePath: existsSync(EXE) ? EXE : undefined });
const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: args.dark === 'true' ? 'dark' : 'light', hasTouch: args.touch === 'true' });
await ctx.addInitScript((seed) => { for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v); if (seed.__onboarded) localStorage.setItem('symaptic:onboarded', '1'); }, { ...seedStorage([5, 100]), __onboarded: args.onboarding !== 'true' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('page error:', e.message));
page.on('console', (m) => m.type() === 'error' && console.error('console error:', m.text()));
mkdirSync('scripts/out/shots', { recursive: true });
for (const [name, path] of pages) {
  await page.goto(`${URL}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  if (args.select === 'true' && path.startsWith('/d/')) {
    const n = page.locator('.react-flow__node-idea').nth(1);
    await n.click();
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: `scripts/out/shots/${LABEL}-${name}${args.dark === 'true' ? '-dark' : ''}.png` });
  console.log(`scripts/out/shots/${LABEL}-${name}${args.dark === 'true' ? '-dark' : ''}.png`);
}
await browser.close();
