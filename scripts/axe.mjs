#!/usr/bin/env node
// axe-core accessibility scan of the main screens (seeded demo mode).
//   npx vite preview --port 4173 & node scripts/axe.mjs
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { seedStorage } from './seed.mjs';

const URL = process.env.URL ?? 'http://localhost:4173';
const EXE = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: existsSync(EXE) ? EXE : undefined });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript((seed) => { for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v); localStorage.setItem('symaptic:onboarded', '1'); }, seedStorage([5]));
const page = await ctx.newPage();
const out = [];
let total = 0;
for (const [name, path, prep] of [
  ['landing', '/', null],
  ['my-maps', '/app', null],
  ['editor', '/d/perf-5', async () => { await page.locator('.react-flow__node-idea').nth(1).click(); await page.waitForTimeout(300); }],
  ['share-dialog', '/d/perf-5', async () => { await page.getByRole('button', { name: 'Share' }).click(); await page.waitForTimeout(300); }],
]) {
  await page.goto(`${URL}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  if (prep) await prep();
  await page.waitForTimeout(700); // let open/close animations finish so colours are final
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
  total += r.violations.length;
  out.push(`## ${name}: ${r.violations.length} violation(s)`);
  for (const v of r.violations) {
    out.push(`- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodes)`);
    for (const n of v.nodes.slice(0, 3)) out.push(`    ${n.html.slice(0, 160)} — ${(n.any[0]?.message ?? n.failureSummary ?? '').slice(0, 160)}`);
  }
}
await browser.close();
mkdirSync('scripts/out', { recursive: true });
writeFileSync('scripts/out/axe.md', out.join('\n') + '\n');
console.log(out.join('\n'));
process.exit(total ? 1 : 0);
