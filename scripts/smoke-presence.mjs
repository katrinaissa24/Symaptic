#!/usr/bin/env node
// Two tabs on the same map: each should see the other's avatar, cursor and selection.
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { seedStorage } from './seed.mjs';
const URL = process.env.URL ?? 'http://localhost:4173';
const EXE = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: existsSync(EXE) ? EXE : undefined });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
await ctx.addInitScript((seed) => { for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v); localStorage.setItem('symaptic:onboarded', '1'); }, seedStorage([5]));
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`); };
const a = await ctx.newPage();
const b = await ctx.newPage();
for (const p of [a, b]) p.on('pageerror', (e) => console.error('page error:', e.message));
// Tab B is a different person (demo user is per-tab via sessionStorage client id, but uid is shared; give B its own user).
await b.addInitScript(() => localStorage.setItem('symaptic:demo-user', JSON.stringify({ uid: 'demo-other', email: 'other@example.com', name: 'Other Person', isAnonymous: false })));
await a.goto(`${URL}/d/perf-5`, { waitUntil: 'load' });
await a.waitForSelector('.react-flow__node-idea', { timeout: 60000 });
await b.goto(`${URL}/d/perf-5`, { waitUntil: 'load' });
await b.waitForSelector('.react-flow__node-idea', { timeout: 60000 });
// Note: B's init script overwrote the shared localStorage user; A keeps its in-memory user.
await a.waitForTimeout(800);
const viewersA = await a.locator('.topbar-people .avatar').count();
check('tab A shows the other viewer', viewersA >= 1, `${viewersA} avatar(s)`);
const viewersB = await b.locator('.topbar-people .avatar').count();
check('tab B shows the other viewer', viewersB >= 1, `${viewersB} avatar(s)`);
// Move the pointer in B; A should render a cursor with B's name.
const pane = await b.locator('.react-flow__pane').boundingBox();
await b.mouse.move(pane.x + 300, pane.y + 300);
await b.mouse.move(pane.x + 420, pane.y + 340, { steps: 8 });
await a.waitForTimeout(500);
const cursorName = await a.locator('.cursor-name').allInnerTexts();
check('tab A shows B\'s live cursor', cursorName.includes('Other Person'), cursorName.join('|'));
// Select an idea in B; A should outline it in B's colour.
await b.locator('.react-flow__node-idea', { hasText: 'Docs' }).first().click();
await a.waitForTimeout(500);
const remote = await a.locator('.is-remote-selected').count();
check('tab A shows B\'s selection', remote === 1, `${remote} remote-selected`);
// Close B; A should drop the avatar.
await b.close();
await a.waitForTimeout(600);
const after = await a.locator('.topbar-people .avatar').count();
check('avatar disappears when the tab closes', after === 0, `${after} left`);
await browser.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
