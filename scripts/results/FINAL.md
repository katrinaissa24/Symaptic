# Before / after

Before = commit e86d026 (original app) measured with the final harness. After = this branch. Headless Chromium, software rendering, 1440×900. Pointer input at ~250 Hz; frame = requestAnimationFrame delta; the trace columns are total ms of main-thread work during a ~1 s gesture.

## Frame time while interacting

| ideas | gesture | before mean / p95 (ms) | after mean / p95 (ms) | frames >20 ms before → after | main-thread ms per frame before → after | IdeaNode renders before → after | paint ms before → after |
|---|---|---|---|---|---|---|---|
| 5 | pan | 17.05 / 16.8 | **16.86 / 16.7** | 2% → 1% | 7.5 → **5.4** | 0 → 1 | 54 → 32 |
| 5 | zoom | 16.67 / 16.7 | **16.67 / 16.7** | 0% → 0% | 2.6 → **4.6** | 0 → 3 | 17 → 25 |
| 5 | drag | 16.86 / 16.8 | **16.67 / 16.7** | 1% → 0% | 7.4 → **5.2** | 1839 → 2 | 105 → 75 |
| 5 | drag-branch (3 ideas) | 16.76 / 16.8 | **16.67 / 16.7** | 1% → 0% | 10.3 → **5.2** | 2159 → 2 | 108 → 76 |
| 100 | pan | 17.28 / 16.8 | **16.75 / 16.8** | 3% → 1% | 7.6 → **6.9** | 0 → 11 | 143 → 117 |
| 100 | zoom | 16.67 / 16.8 | **16.67 / 16.7** | 0% → 0% | 4.5 → **7.0** | 0 → 98 | 42 → 89 |
| 100 | drag | 18.83 / 33.3 | **16.75 / 16.7** | 11% → 1% | 15.6 → **11.3** | 37748 → 12 | 1481 → 567 |
| 100 | drag-branch (27 ideas) | 17.83 / 33.3 | **16.67 / 16.7** | 6% → 0% | 15.4 → **11.9** | 32030 → 2 | 1147 → 672 |
| 500 | pan | 18.35 / 33.3 | **18.63 / 33.3** | 10% → 8% | 13.4 → **12.6** | 0 → 30 | 667 → 446 |
| 500 | zoom | 16.95 / 16.7 | **17.58 / 16.8** | 2% → 4% | 10.0 → **8.9** | 0 → 327 | 252 → 307 |
| 500 | drag | 40.57 / 116.7 | **19.33 / 33.4** | 40% → 11% | 40.4 → **17.9** | 210107 → 43 | 4429 → 2592 |
| 500 | drag-branch (71 ideas) | 39.3 / 116.7 | **18.24 / 33.3** | 38% → 7% | 39.1 → **16.9** | 215471 → 16 | 3907 → 2476 |
| 1000 | pan | 32.52 / 66.7 | **18.55 / 33.4** | 43% → 8% | 26.9 → **12.5** | 0 → 28 | 1763 → 398 |
| 1000 | zoom | 18.5 / 33.4 | **17.67 / 33.3** | 11% → 5% | 13.8 → **9.0** | 0 → 363 | 513 → 303 |
| 1000 | drag | 73.25 / 250 | **19.95 / 33.4** | 50% → 9% | 73.2 → **18.6** | 471009 → 38 | 5091 → 2656 |
| 1000 | drag-branch (184 ideas) | 146.01 / 283.4 | **19.63 / 33.4** | 99% → 15% | 146.0 → **17.9** | 480187 → 4 | 5232 → 2461 |

## Typing latency and load

| ideas | typing p95 before → after (ms) | typing mean | first idea painted (ms) | DOM elements | rendered nodes |
|---|---|---|---|---|---|
| 5 | 24 → **32** | 16.73 → 20.63 | 897 → 571 | 181 → 186 | 5 → 5 |
| 100 | 40 → **40** | 26.13 → 20.71 | 321 → 588 | 2171 → 1268 | 105 → 105 |
| 500 | 80 → **72** | 32.4 → 34 | 783 → 803 | 10171 → 4393 | 505 → 385 |
| 1000 | 192 → **32** | 106 → 24 | 1523 → 1014 | 20171 → 4481 | 1005 → 387 |

## Bundle

| | before | after |
|---|---|---|
| total JS (kB, uncompressed) | 1058 | **1439** |
| JS for My maps (kB) | 1058 (one chunk) | **1178** |
| JS for the editor (kB) | 1058 (one chunk) | **1412** |
| chunks | 1 | 14 |
| fonts | Google Fonts (3 families, variable) | self-hosted Inter woff2 ×3, Latin, preloaded |

## Lighthouse (desktop, simulated throttling, localhost)

| page | performance | accessibility | best practices | LCP (ms) | TBT (ms) | CLS |
|---|---|---|---|---|---|---|
| landing | 92 → **100** | 90 → **100** | 100 → **100** | 646 → 689 | 0 → 0 | 0.172 → 0.000 |
| my-maps | 100 → **100** | 91 → **100** | 100 → **100** | 243 → 305 | 0 → 0 | 0.000 → 0.000 |
| editor-100 | 100 → **100** | 85 → **100** | 100 → **100** | 284 → 488 | 0 → 0 | 0.000 → 0.000 |

## Lighthouse, mobile preset (Moto G Power, slow 4G, 4× CPU slowdown; after only)

| page | performance | accessibility | best practices | FCP (ms) | LCP (ms) | TBT (ms) | CLS |
|---|---|---|---|---|---|---|---|
| landing | 87 | 100 | 100 | 2716 | 3495 | 13 | 0.003 |
| my-maps | 100 | 100 | 100 | 1069 | 1181 | 25 | 0.000 |
| editor-100 | 94 | 100 | 100 | 1385 | 1845 | 263 | 0.000 |

## axe (WCAG 2.1 AA + best practice)

- landing: 0 violation(s)
- my-maps: 0 violation(s)
- editor: 0 violation(s)
- share-dialog: 0 violation(s)

## How to read these numbers

- Headless Chromium here has no GPU: raster runs in software (SwiftShader) on worker threads, so the raster column and anything downstream of it is pessimistic. The frame-time and main-thread columns are CPU work and transfer to real machines; a real GPU only makes things better.
- Desktop Lighthouse ran against the production build on localhost with simulated 10 Mbps / 40 ms network, so network numbers are optimistic; the mobile preset above applies slow 4G and a 4× CPU slowdown and is the stricter view.
- Raw data: scripts/out/baseline-final.json, scripts/out/final.json, scripts/out/lh-*.json.
