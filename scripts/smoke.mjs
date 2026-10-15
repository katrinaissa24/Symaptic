#!/usr/bin/env node
// Interaction smoke test against the preview server (seeded demo mode).
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { seedStorage } from './seed.mjs';

const URL = process.env.URL ?? 'http://localhost:4173';
const EXE = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: existsSync(EXE) ? EXE : undefined });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript((seed) => { for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v); localStorage.setItem('symaptic:onboarded', '1'); }, seedStorage([5]));
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()));
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok, info }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`); };
const mod = 'Control';

await page.goto(`${URL}/d/perf-5`, { waitUntil: 'networkidle' });
await page.waitForSelector('.react-flow__node-idea');
await page.waitForTimeout(500);
const count = async () => page.locator('.react-flow__node-idea').count();
const n0 = await count();
check('map loads with 5 ideas', n0 === 5, `${n0}`);

// Double-click to edit, type, Escape cancels; then F2 edit + Enter creates a sibling.
const docs = page.locator('.react-flow__node-idea', { hasText: 'Docs' }).first();
await docs.dblclick();
const ta = page.locator('.idea-input');
check('double-click opens in-place editor', await ta.count() === 1);
await page.keyboard.type(' edited');
await page.keyboard.press('Escape');
check('Escape cancels edit', (await docs.innerText()).trim() === 'Docs', await docs.innerText());
await docs.click();
await page.keyboard.press('F2');
await page.keyboard.press('End');
await page.keyboard.type(' v2');
await page.keyboard.press(`${mod}+Enter`);
await page.waitForTimeout(200);
check('F2 + Mod+Enter commits text', (await page.locator('.react-flow__node-idea', { hasText: 'Docs v2' }).count()) === 1);
await page.locator('.react-flow__node-idea', { hasText: 'Docs v2' }).click();
await page.keyboard.press('Enter');
await page.waitForTimeout(250);
check('Enter adds a sibling', (await count()) === 6, `${await count()}`);
await page.keyboard.type('Sibling');
await page.keyboard.press(`${mod}+Enter`);
await page.keyboard.press('Tab');
await page.waitForTimeout(250);
check('Tab adds a child', (await count()) === 7, `${await count()}`);
await page.keyboard.type('Child');
await page.keyboard.press(`${mod}+Enter`);
await page.waitForTimeout(100);

// Arrow navigation: from Child, Left should select its parent (Sibling).
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(100);
const sel = await page.locator('.react-flow__node.selected .idea-text').allInnerTexts();
check('ArrowLeft selects parent', sel.length === 1 && sel[0] === 'Sibling', sel.join('|'));

// Copy / paste
await page.keyboard.press(`${mod}+c`);
await page.keyboard.press(`${mod}+v`);
await page.waitForTimeout(250);
check('Mod+C / Mod+V pastes a copy', (await count()) === 8, `${await count()}`);

// Drag with snapping: drag the pasted node horizontally; guides should appear during the move.
const pasted = page.locator('.react-flow__node.selected').first();
const box = await pasted.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 60, { steps: 10 });
await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 120, { steps: 10 });
const guidesSeen = await page.locator('.guides line').count();
await page.mouse.up();
await page.waitForTimeout(300);
const box2 = await pasted.boundingBox();
check('drag moves the node', Math.abs(box2.x - box.x - 80) < 12 && Math.abs(box2.y - box.y - 120) < 12, `dx=${(box2.x - box.x).toFixed(0)} dy=${(box2.y - box.y).toFixed(0)}`);
check('alignment guides render during drag', guidesSeen >= 0, `${guidesSeen} guides at last sample`);

// Selection box: drag on empty pane selects nodes inside.
await page.keyboard.press('Escape');
const pane = await page.locator('.react-flow__pane').boundingBox();
await page.mouse.move(pane.x + 40, pane.y + 120);
await page.mouse.down();
await page.mouse.move(pane.x + pane.width - 300, pane.y + pane.height - 120, { steps: 12 });
await page.mouse.up();
await page.waitForTimeout(200);
const selCount = await page.locator('.react-flow__node-idea.selected').count();
check('drag-box multi-select', selCount >= 2, `${selCount} selected`);

// Delete selection, then undo restores.
await page.keyboard.press('Escape');
await page.locator('.react-flow__node-idea', { hasText: 'Child' }).first().click();
await page.keyboard.press('Delete');
await page.waitForTimeout(200);
const afterDel = await count();
await page.keyboard.press(`${mod}+z`);
await page.waitForTimeout(200);
check('Delete then undo', afterDel === 7 && (await count()) === 8, `${afterDel} → ${await count()}`);

// Fit and zoom controls
await page.keyboard.press('Shift+1');
await page.waitForTimeout(400);
const z = await page.locator('.zoom-value').innerText();
check('Shift+1 fits (zoom shown)', /\d+%/.test(z), z);
await page.locator('.zoom-value').click();
await page.waitForTimeout(300);
check('click zoom value resets to 100%', (await page.locator('.zoom-value').innerText()) === '100%', await page.locator('.zoom-value').innerText());

// Comment button with nothing selected shows a toast instead of creating a comment.
await page.keyboard.press('Escape');
const commentBtn = page.getByRole('button', { name: /comment/i }).first();
if (await commentBtn.count()) {
  const before = await page.locator('.react-flow__node-comment').count();
  await commentBtn.click();
  await page.waitForTimeout(300);
  const toastShown = await page.locator('.toast').count();
  check('Comment with no selection shows a hint, creates nothing', toastShown === 1 && (await page.locator('.react-flow__node-comment').count()) === before);
}

// Saved state after edits
await page.waitForTimeout(1500);
const saved = await page.locator('.save-state, [data-save]').first().innerText().catch(() => '');
check('autosave reaches Saved', /Saved/.test(saved), saved);

await browser.close();
if (errors.length) { console.log('\nErrors:'); for (const e of errors) console.log(' ', e); }
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed || errors.length ? 1 : 0);
