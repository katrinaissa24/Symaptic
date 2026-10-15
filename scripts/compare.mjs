#!/usr/bin/env node
// Builds scripts/results/FINAL.md from two perf runs and two Lighthouse runs.
//   node scripts/compare.mjs baseline-final final
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const [a = 'baseline-final', b = 'final'] = process.argv.slice(2);
const load = (f) => JSON.parse(readFileSync(`scripts/out/${f}.json`, 'utf8'));
const A = load(a), B = load(b);
const lhA = existsSync('scripts/out/lh-baseline.json') ? JSON.parse(readFileSync('scripts/out/lh-baseline.json', 'utf8')) : null;
const lhB = existsSync('scripts/out/lh-final.json') ? JSON.parse(readFileSync('scripts/out/lh-final.json', 'utf8')) : null;
const pct = (x, y) => (x && y ? `${Math.round(((y - x) / x) * 100)}%` : '–');
const out = [];
out.push('# Before / after', '', `Before = commit e86d026 (original app) measured with the final harness. After = this branch. Headless Chromium, software rendering, 1440×900. Pointer input at ~250 Hz; frame = requestAnimationFrame delta; the trace columns are total ms of main-thread work during a ~1 s gesture.`, '');
out.push('## Frame time while interacting', '', '| ideas | gesture | before mean / p95 (ms) | after mean / p95 (ms) | frames >20 ms before → after | IdeaNode renders before → after | paint ms before → after |', '|---|---|---|---|---|---|---|');
for (const sa of A.sizes) {
  const sb = B.sizes.find((s) => s.n === sa.n);
  if (!sb) continue;
  for (const ga of sa.gestures) {
    const key = ga.name.split(' ')[0];
    const gb = sb.gestures.find((g) => g.name.split(' ')[0] === key);
    if (!gb) continue;
    out.push(`| ${sa.n} | ${gb.name} | ${ga.frames.mean} / ${ga.frames.p95} | **${gb.frames.mean} / ${gb.frames.p95}** | ${ga.frames.over20}% → ${gb.frames.over20}% | ${ga.renders.IdeaNode ?? 0} → ${gb.renders.IdeaNode ?? 0} | ${ga.trace?.paint ?? '–'} → ${gb.trace?.paint ?? '–'} |`);
  }
}
out.push('', '## Typing latency and load', '', '| ideas | typing p95 before → after (ms) | typing mean | first idea painted (ms) | DOM elements | rendered nodes |', '|---|---|---|---|---|---|');
for (const sa of A.sizes) {
  const sb = B.sizes.find((s) => s.n === sa.n);
  if (!sb) continue;
  out.push(`| ${sa.n} | ${sa.typing?.p95 ?? '–'} → **${sb.typing?.p95 ?? '–'}** | ${sa.typing?.mean ?? '–'} → ${sb.typing?.mean ?? '–'} | ${sa.firstNodeMs} → ${sb.firstNodeMs} | ${sa.domCount} → ${sb.domCount} | ${sa.renderedNodes} → ${sb.renderedNodes} |`);
}
const sum = (r) => (r.bundle ?? []).filter((f) => f.file.endsWith('.js')).reduce((s, f) => s + f.kb, 0);
const first = (r, page) => {
  // JS needed for the first paint of a page: entry + vendor chunks it statically imports (approximation: all non-page chunks).
  const js = (r.bundle ?? []).filter((f) => f.file.endsWith('.js'));
  const pageChunks = js.filter((f) => /^(Landing|Login|Dashboard|EditorPage|NotFound|ShareDialog|Inspector|store|Logo|AccountMenu|icons|MapThumb)-/.test(f.file));
  const shared = js.filter((f) => !pageChunks.includes(f));
  const need = page === 'editor' ? ['EditorPage', 'flow'] : page === 'maps' ? ['Dashboard'] : ['Landing'];
  const picked = js.filter((f) => need.some((n) => f.file.startsWith(n + '-')) || (shared.includes(f) && !f.file.startsWith('flow-')));
  return Math.round(picked.reduce((s, f) => s + f.kb, 0));
};
out.push('', '## Bundle', '', '| | before | after |', '|---|---|---|');
out.push(`| total JS (kB, uncompressed) | ${Math.round(sum(A))} | **${Math.round(sum(B))}** |`);
out.push(`| JS for My maps (kB) | ${Math.round(sum(A))} (one chunk) | **${first(B, 'maps')}** |`);
out.push(`| JS for the editor (kB) | ${Math.round(sum(A))} (one chunk) | **${first(B, 'editor')}** |`);
out.push(`| chunks | ${(A.bundle ?? []).filter((f) => f.file.endsWith('.js')).length} | ${(B.bundle ?? []).filter((f) => f.file.endsWith('.js')).length} |`);
out.push(`| fonts | Google Fonts (3 families, variable) | self-hosted Inter woff2 ×3, Latin, preloaded |`);
if (lhA && lhB) {
  out.push('', '## Lighthouse (desktop, simulated throttling, localhost)', '', '| page | performance | accessibility | best practices | LCP (ms) | TBT (ms) | CLS |', '|---|---|---|---|---|---|---|');
  for (const sa of lhA) {
    const sb = lhB.find((s) => s.name === sa.name);
    if (!sb) continue;
    const S = (o, k) => Math.round((o.scores[k] ?? 0) * 100);
    out.push(`| ${sa.name} | ${S(sa, 'performance')} → **${S(sb, 'performance')}** | ${S(sa, 'accessibility')} → **${S(sb, 'accessibility')}** | ${S(sa, 'best-practices')} → **${S(sb, 'best-practices')}** | ${Math.round(sa.audits['largest-contentful-paint'])} → ${Math.round(sb.audits['largest-contentful-paint'])} | ${Math.round(sa.audits['total-blocking-time'])} → ${Math.round(sb.audits['total-blocking-time'])} | ${(sa.audits['cumulative-layout-shift'] ?? 0).toFixed(3)} → ${(sb.audits['cumulative-layout-shift'] ?? 0).toFixed(3)} |`);
  }
}
if (existsSync('scripts/out/axe.md')) out.push('', '## axe (WCAG 2.1 AA + best practice)', '', readFileSync('scripts/out/axe.md', 'utf8').trim().split('\n').filter((l) => l.startsWith('## ')).map((l) => '- ' + l.slice(3)).join('\n'));
out.push('', `Raw data: scripts/out/${a}.json, scripts/out/${b}.json. Change ${pct(1, 1)} columns are relative.`.replace(' Change – columns are relative.', ''));
writeFileSync('scripts/results/FINAL.md', out.join('\n') + '\n');
console.log(out.join('\n'));
