#!/usr/bin/env node
// Renders public/og.png (1200×630) from a small HTML card.
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
const EXE = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: existsSync(EXE) ? EXE : undefined });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(`<!doctype html><html><head><style>
  @font-face { font-family: Inter; src: url(file://${process.cwd()}/public/fonts/inter-latin-600-normal.woff2) format('woff2'); font-weight: 600; }
  @font-face { font-family: Inter; src: url(file://${process.cwd()}/public/fonts/inter-latin-400-normal.woff2) format('woff2'); font-weight: 400; }
  body { margin: 0; width: 1200px; height: 630px; background: #fafafa; font-family: Inter, system-ui, sans-serif; color: #18181b; display: flex; flex-direction: column; justify-content: center; padding: 80px; box-sizing: border-box; }
  .brand { display: flex; align-items: center; gap: 14px; font-weight: 600; font-size: 28px; }
  h1 { font-size: 64px; line-height: 1.08; letter-spacing: -0.02em; margin: 36px 0 20px; font-weight: 600; max-width: 900px; }
  p { font-size: 28px; color: #52525b; margin: 0; }
  .map { position: absolute; right: 80px; top: 120px; width: 300px; }
</style></head><body>
  <div class="brand"><svg width="40" height="40" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#4f46e5"/><g fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><path d="M16 16C11.5 16 11.5 8 6.5 8"/><path d="M16 16C20.5 16 20.5 8 25.5 8"/><path d="M16 16C11.5 16 11.5 24 6.5 24"/><path d="M16 16C20.5 16 20.5 24 25.5 24"/></g><circle cx="16" cy="16" r="3.6" fill="#fff"/></svg>Symaptic</div>
  <h1>Mind maps your team will actually read.</h1>
  <p>A calm, fast canvas for branching ideas.</p>
</body></html>`);
await page.waitForTimeout(300);
await page.screenshot({ path: 'public/og.png' });
await browser.close();
console.log('public/og.png written');
