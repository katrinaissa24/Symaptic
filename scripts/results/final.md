# Perf: final (2026-10-16T06:10:57.968Z)

| nodes | gesture | frame mean | frame p95 | frame max | frames >20ms | main-thread ms/frame | script | style | layout | paint | raster | IdeaNode renders |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 5 | pan | 16.67 | 16.7 | 16.8 | 0% | – | 232 | 23 | 20 | 30 | 74 | 1 |
| 5 | zoom | 16.67 | 16.8 | 16.8 | 0% | – | 100 | 14 | 12 | 27 | 1036 | 3 |
| 5 | drag | 16.67 | 16.7 | 16.8 | 0% | 1.8 | 471 | 28 | 22 | 85 | 61 | 2 |
| 5 | drag-branch (3 ideas) | 16.67 | 16.8 | 16.8 | 0% | 1.7 | 426 | 32 | 19 | 69 | 54 | 2 |
| 100 | pan | 16.67 | 16.7 | 16.8 | 0% | 3.3 | 450 | 34 | 38 | 115 | 126 | 11 |
| 100 | zoom | 16.77 | 16.7 | 33.4 | 1% | – | 246 | 33 | 38 | 112 | 1816 | 98 |
| 100 | drag | 16.76 | 16.8 | 33.3 | 1% | 4 | 1042 | 42 | 65 | 534 | 94 | 12 |
| 100 | drag-branch (27 ideas) | 16.67 | 16.8 | 16.8 | 0% | 4.3 | 1289 | 98 | 53 | 634 | 173 | 2 |
| 500 | pan | 18.71 | 33.4 | 66.7 | 8% | 6.4 | 1405 | 46 | 77 | 465 | 206 | 30 |
| 500 | zoom | 17.33 | 16.8 | 49.9 | 3% | 8.4 | 468 | 56 | 78 | 295 | 869 | 327 |
| 500 | drag | 18.85 | 33.3 | 116.7 | 7% | 7.6 | 4478 | 103 | 322 | 2518 | 382 | 41 |
| 500 | drag-branch (71 ideas) | 18.02 | 33.3 | 66.7 | 7% | 7.2 | 3560 | 321 | 263 | 1837 | 402 | 17 |
| 1000 | pan | 18.83 | 33.3 | 66.7 | 7% | 6.4 | 1328 | 40 | 75 | 417 | 180 | 28 |
| 1000 | zoom | 17.23 | 16.8 | 33.4 | 3% | 8.2 | 506 | 51 | 77 | 296 | 738 | 363 |
| 1000 | drag | 18.72 | 33.3 | 99.9 | 7% | 7.4 | 4199 | 94 | 288 | 2244 | 390 | 42 |
| 1000 | drag-branch (184 ideas) | 19.2 | 33.4 | 83.3 | 12% | 7.7 | 4349 | 641 | 274 | 1846 | 578 | 3 |

Frame times in ms from requestAnimationFrame deltas. "main-thread ms/frame" is CPU work on the renderer main thread per animation frame (GPU-independent; under 16.7 means the main thread leaves headroom). script/style/layout/paint/raster are total ms of trace work during the gesture (~1 s of input); raster runs on worker threads and is software-rendered here.

| nodes | typing mean ms | typing p95 ms | first node ms | DOMContentLoaded ms | DOM elements | rendered nodes |
|---|---|---|---|---|---|---|
| 5 | 22.12 | 40 | 523 | 107 | 189 | 5 |
| 100 | 21.78 | 40 | 542 | 70 | 1271 | 105 |
| 500 | 36.4 | 72 | 736 | 74 | 4396 | 385 |
| 1000 | 26 | 48 | 1029 | 150 | 4484 | 387 |

| bundle file | kB |
|---|---|
| firebase-D03EWdHt.js | 550.5 |
| react-Y8u4CMjP.js | 241.5 |
| flow-CsN1_EZQ.js | 187.2 |
| index-Db4hyJdp.js | 87.6 |
| usePageTitle-CL8za7II.js | 79.7 |
| EditorPage-CZghWWJV.js | 73.8 |
| index-CZfrqyD_.css | 55.5 |
| Dashboard-C_fvXdSx.js | 11 |
| flow-CeJeskZg.css | 10.9 |
| viewport-DuMitCSm.js | 7.3 |
| AccountMenu-BIF8YvxL.js | 5.5 |
| ShareDialog-DilEcnnp.js | 5.1 |
| Landing-D7FQHTW1.js | 5 |
| Login-wEIUC4ar.js | 4.9 |
| Inspector-Brk17AeE.js | 4.6 |
| MapThumb-BjDZCI7i.js | 3.4 |
| NotFound-wPaL-A9L.js | 1 |
| rolldown-runtime-XKyaHtl9.js | 0.7 |
| lock-0iezzzxs.js | 0.4 |
| message-square-BmaawKTl.js | 0.3 |
| arrow-right-tXvtHJFY.js | 0.2 |
