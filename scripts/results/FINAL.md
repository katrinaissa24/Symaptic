# Before / after

Before = commit e86d026 (original app) measured with the final harness. After = this branch. Headless Chromium, software rendering, 1440×900. Pointer input at ~250 Hz; frame = requestAnimationFrame delta; the trace columns are total ms of main-thread work during a ~1 s gesture.

## Frame time while interacting

| ideas | gesture | before mean / p95 (ms) | after mean / p95 (ms) | frames >20 ms before → after | main-thread ms per frame before → after | IdeaNode renders before → after | paint ms before → after |
|---|---|---|---|---|---|---|---|
| 5 | pan | 17.05 / 16.8 | **16.67 / 16.7** | 2% → 0% | 7.5 → **5.1** | 0 → 1 | 54 → 30 |
| 5 | zoom | 16.67 / 16.7 | **16.67 / 16.8** | 0% → 0% | 2.6 → **4.9** | 0 → 3 | 17 → 27 |
| 5 | drag | 16.86 / 16.8 | **16.67 / 16.7** | 1% → 0% | 7.4 → **5.3** | 1839 → 2 | 105 → 85 |
| 5 | drag-branch (3 ideas) | 16.76 / 16.8 | **16.67 / 16.8** | 1% → 0% | 10.3 → **4.8** | 2159 → 2 | 108 → 69 |
| 100 | pan | 17.28 / 16.8 | **16.67 / 16.7** | 3% → 0% | 7.6 → **6.8** | 0 → 11 | 143 → 115 |
| 100 | zoom | 16.67 / 16.8 | **16.77 / 16.7** | 0% → 1% | 4.5 → **7.2** | 0 → 98 | 42 → 112 |
| 100 | drag | 18.83 / 33.3 | **16.76 / 16.8** | 11% → 1% | 15.6 → **11.5** | 37748 → 12 | 1481 → 534 |
| 100 | drag-branch (27 ideas) | 17.83 / 33.3 | **16.67 / 16.8** | 6% → 0% | 15.4 → **11.9** | 32030 → 2 | 1147 → 634 |
| 500 | pan | 18.35 / 33.3 | **18.71 / 33.4** | 10% → 8% | 13.4 → **12.8** | 0 → 30 | 667 → 465 |
| 500 | zoom | 16.95 / 16.7 | **17.33 / 16.8** | 2% → 3% | 10.0 → **8.7** | 0 → 327 | 252 → 295 |
| 500 | drag | 40.57 / 116.7 | **18.85 / 33.3** | 40% → 7% | 40.4 → **17.5** | 210107 → 41 | 4429 → 2518 |
| 500 | drag-branch (71 ideas) | 39.3 / 116.7 | **18.02 / 33.3** | 38% → 7% | 39.1 → **15.8** | 215471 → 17 | 3907 → 1837 |
| 1000 | pan | 32.52 / 66.7 | **18.83 / 33.3** | 43% → 7% | 26.9 → **12.7** | 0 → 28 | 1763 → 417 |
| 1000 | zoom | 18.5 / 33.4 | **17.23 / 16.8** | 11% → 3% | 13.8 → **8.5** | 0 → 363 | 513 → 296 |
| 1000 | drag | 73.25 / 250 | **18.72 / 33.3** | 50% → 7% | 73.2 → **17.2** | 471009 → 42 | 5091 → 2244 |
| 1000 | drag-branch (184 ideas) | 146.01 / 283.4 | **19.2 / 33.4** | 99% → 12% | 146.0 → **16.9** | 480187 → 3 | 5232 → 1846 |

## Typing latency and load

| ideas | typing p95 before → after (ms) | typing mean | first idea painted (ms) | DOM elements | rendered nodes |
|---|---|---|---|---|---|
| 5 | 24 → **40** | 16.73 → 22.12 | 897 → 523 | 181 → 189 | 5 → 5 |
| 100 | 40 → **40** | 26.13 → 21.78 | 321 → 542 | 2171 → 1271 | 105 → 105 |
| 500 | 80 → **72** | 32.4 → 36.4 | 783 → 736 | 10171 → 4396 | 505 → 385 |
| 1000 | 192 → **48** | 106 → 26 | 1523 → 1029 | 20171 → 4484 | 1005 → 387 |

## Bundle

| | before | after |
|---|---|---|
| total JS (kB, uncompressed) | 1058 | **1270** |
| JS for My maps (kB) | 1058 (one chunk) | **979** |
| JS for the editor (kB) | 1058 (one chunk) | **1229** |
| chunks | 1 | 19 |
| fonts | Google Fonts (3 families, variable) | self-hosted Inter woff2 ×3, Latin, preloaded |

## Lighthouse (desktop, simulated throttling, localhost)

| page | performance | accessibility | best practices | LCP (ms) | TBT (ms) | CLS |
|---|---|---|---|---|---|---|
| landing | 92 → **100** | 90 → **100** | 100 → **100** | 646 → 730 | 0 → 0 | 0.172 → 0.000 |
| my-maps | 100 → **100** | 91 → **100** | 100 → **100** | 243 → 347 | 0 → 0 | 0.000 → 0.000 |
| editor-100 | 100 → **100** | 85 → **100** | 100 → **100** | 284 → 453 | 0 → 0 | 0.000 → 0.000 |

## Lighthouse, mobile preset (Moto G Power, slow 4G, 4× CPU slowdown; after only)

| page | performance | accessibility | best practices | FCP (ms) | LCP (ms) | TBT (ms) | CLS |
|---|---|---|---|---|---|---|---|
| landing | 82 | 100 | 100 | 3246 | 3771 | 0 | 0.000 |
| my-maps | 100 | 100 | 100 | 1162 | 1419 | 6 | 0.001 |
| editor-100 | 98 | 100 | 100 | 1356 | 1817 | 137 | 0.000 |

## axe (WCAG 2.1 AA + best practice)

- landing: 0 violation(s)
- my-maps: 0 violation(s)
- editor: 0 violation(s)
- share-dialog: 0 violation(s)

## How to read these numbers

- Headless Chromium here has no GPU: raster runs in software (SwiftShader) on worker threads, so the raster column and anything downstream of it is pessimistic. The frame-time and main-thread columns are CPU work and transfer to real machines; a real GPU only makes things better.
- Desktop Lighthouse ran against the production build on localhost with simulated 10 Mbps / 40 ms network, so network numbers are optimistic; the mobile preset above applies slow 4G and a 4× CPU slowdown and is the stricter view.
- Raw data: scripts/out/baseline-final.json, scripts/out/final.json, scripts/out/lh-*.json.
