# Before / after

Before = commit e86d026 (original app) measured with the final harness. After = this branch. Headless Chromium, software rendering, 1440×900. Pointer input at ~250 Hz; frame = requestAnimationFrame delta; the trace columns are total ms of main-thread work during a ~1 s gesture.

## Frame time while interacting

| ideas | gesture | before mean / p95 (ms) | after mean / p95 (ms) | frames >20 ms before → after | IdeaNode renders before → after | paint ms before → after |
|---|---|---|---|---|---|---|
| 5 | pan | 16.67 / 16.7 | **16.77 / 16.7** | 0% → 1% | 0 → 1 | 53 → 30 |
| 5 | zoom | 16.67 / 16.7 | **16.67 / 16.7** | 0% → 0% | 0 → 3 | 18 → 25 |
| 5 | drag | 16.67 / 16.8 | **16.76 / 16.8** | 0% → 1% | 1857 → 2 | 98 → 65 |
| 5 | drag-branch (3 ideas) | 16.86 / 16.7 | **16.67 / 16.7** | 1% → 0% | 2183 → 2 | 99 → 64 |
| 100 | pan | 16.67 / 16.7 | **16.67 / 16.7** | 0% → 0% | 0 → 11 | 110 → 100 |
| 100 | zoom | 16.67 / 16.7 | **16.67 / 16.7** | 0% → 0% | 0 → 98 | 35 → 93 |
| 100 | drag | 17.62 / 33.2 | **16.75 / 16.8** | 5% → 1% | 36547 → 12 | 1154 → 509 |
| 100 | drag-branch (27 ideas) | 16.85 / 16.8 | **16.67 / 16.7** | 1% → 0% | 32019 → 2 | 918 → 504 |
| 500 | pan | 18.3 / 33.3 | **19.02 / 33.4** | 8% → 10% | 0 → 30 | 282 → 447 |
| 500 | zoom | 16.9 / 16.8 | **16.79 / 16.8** | 1% → 1% | 0 → 327 | 99 → 258 |
| 500 | drag | 37.16 / 100.1 | **18.12 / 33.2** | 35% → 5% | 206097 → 41 | 5096 → 2157 |
| 500 | drag-branch (71 ideas) | 39.49 / 116.8 | **17.18 / 16.8** | 37% → 2% | 216637 → 17 | 5359 → 2186 |
| 1000 | pan | 29.86 / 66.7 | **18.18 / 33.3** | 45% → 7% | 0 → 28 | 1760 → 353 |
| 1000 | zoom | 16.98 / 16.8 | **16.67 / 16.7** | 2% → 0% | 0 → 363 | 406 → 259 |
| 1000 | drag | 64.02 / 216.6 | **18.27 / 33.3** | 48% → 5% | 472013 → 42 | 4719 → 2085 |
| 1000 | drag-branch (184 ideas) | 126.26 / 250 | **19.06 / 33.4** | 95% → 12% | 480187 → 3 | 5068 → 1850 |

## Typing latency and load

| ideas | typing p95 before → after (ms) | typing mean | first idea painted (ms) | DOM elements | rendered nodes |
|---|---|---|---|---|---|
| 5 | 16 → **40** | 16 → 21.78 | 590 → 489 | 181 → 189 | 5 → 5 |
| 100 | 40 → **48** | 24.57 → 25.71 | 290 → 507 | 2171 → 1271 | 105 → 105 |
| 500 | 88 → **64** | 36.8 → 37.6 | 668 → 772 | 10171 → 4396 | 505 → 385 |
| 1000 | 144 → **48** | 93.2 → 25.2 | 1338 → 982 | 20171 → 4484 | 1005 → 387 |

## Bundle

| | before | after |
|---|---|---|
| total JS (kB, uncompressed) | 1058 | **1266** |
| JS for My maps (kB) | 1058 (one chunk) | **979** |
| JS for the editor (kB) | 1058 (one chunk) | **1225** |
| chunks | 1 | 19 |
| fonts | Google Fonts (3 families, variable) | self-hosted Inter woff2 ×3, Latin, preloaded |

## Lighthouse (desktop, simulated throttling, localhost)

| page | performance | accessibility | best practices | LCP (ms) | TBT (ms) | CLS |
|---|---|---|---|---|---|---|
| landing | 92 → **100** | 90 → **100** | 100 → **100** | 646 → 730 | 0 → 0 | 0.172 → 0.000 |
| my-maps | 100 → **100** | 91 → **100** | 100 → **100** | 243 → 353 | 0 → 0 | 0.000 → 0.000 |
| editor-100 | 100 → **100** | 85 → **100** | 100 → **100** | 284 → 434 | 0 → 0 | 0.000 → 0.000 |

## axe (WCAG 2.1 AA + best practice)

- landing: 0 violation(s)
- my-maps: 0 violation(s)
- editor: 0 violation(s)
- share-dialog: 0 violation(s)

Raw data: scripts/out/baseline-final.json, scripts/out/final.json. Change 0% columns are relative.
