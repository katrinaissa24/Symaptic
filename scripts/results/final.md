# Perf: final (2026-10-16T06:23:47.203Z)

| nodes | gesture | frame mean | frame p95 | frame max | frames >20ms | main-thread ms/frame | script | style | layout | paint | raster | IdeaNode renders |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 5 | pan | 16.86 | 16.7 | 33.4 | 1% | 5.4 | 250 | 24 | 21 | 32 | 93 | 1 |
| 5 | zoom | 16.67 | 16.7 | 16.8 | 0% | 4.6 | 98 | 13 | 12 | 25 | 991 | 3 |
| 5 | drag | 16.67 | 16.7 | 16.8 | 0% | 5.2 | 476 | 28 | 20 | 75 | 65 | 2 |
| 5 | drag-branch (3 ideas) | 16.67 | 16.7 | 16.8 | 0% | 5.2 | 461 | 34 | 20 | 76 | 56 | 2 |
| 100 | pan | 16.75 | 16.8 | 33.4 | 1% | 6.9 | 476 | 42 | 37 | 117 | 154 | 11 |
| 100 | zoom | 16.67 | 16.7 | 16.8 | 0% | 7 | 199 | 29 | 31 | 89 | 1714 | 98 |
| 100 | drag | 16.75 | 16.7 | 33.3 | 1% | 11.3 | 1129 | 44 | 67 | 567 | 95 | 12 |
| 100 | drag-branch (27 ideas) | 16.67 | 16.7 | 16.8 | 0% | 11.9 | 1312 | 98 | 53 | 672 | 176 | 2 |
| 500 | pan | 18.63 | 33.3 | 66.7 | 8% | 12.6 | 1283 | 47 | 82 | 446 | 226 | 30 |
| 500 | zoom | 17.58 | 16.8 | 66.7 | 4% | 8.9 | 477 | 53 | 80 | 307 | 852 | 327 |
| 500 | drag | 19.33 | 33.4 | 83.3 | 11% | 17.9 | 4424 | 101 | 341 | 2592 | 383 | 43 |
| 500 | drag-branch (71 ideas) | 18.24 | 33.3 | 116.7 | 7% | 16.9 | 4551 | 396 | 360 | 2476 | 525 | 16 |
| 1000 | pan | 18.55 | 33.4 | 66.7 | 8% | 12.5 | 1268 | 41 | 78 | 398 | 188 | 28 |
| 1000 | zoom | 17.67 | 33.3 | 50 | 5% | 9 | 498 | 58 | 81 | 303 | 842 | 363 |
| 1000 | drag | 19.95 | 33.4 | 133.3 | 9% | 18.6 | 4899 | 108 | 341 | 2656 | 426 | 38 |
| 1000 | drag-branch (184 ideas) | 19.63 | 33.4 | 83.4 | 15% | 17.9 | 5754 | 885 | 384 | 2461 | 711 | 4 |

Frame times in ms from requestAnimationFrame deltas. "main-thread ms/frame" is CPU work on the renderer main thread per animation frame (GPU-independent; under 16.7 means the main thread leaves headroom). script/style/layout/paint/raster are total ms of trace work during the gesture (~1 s of input); raster runs on worker threads and is software-rendered here.

| nodes | typing mean ms | typing p95 ms | first node ms | DOMContentLoaded ms | DOM elements | rendered nodes |
|---|---|---|---|---|---|---|
| 5 | 20.63 | 32 | 571 | 122 | 186 | 5 |
| 100 | 20.71 | 40 | 588 | 124 | 1268 | 105 |
| 500 | 34 | 72 | 803 | 93 | 4393 | 385 |
| 1000 | 24 | 32 | 1014 | 141 | 4481 | 387 |

| bundle file | kB |
|---|---|
| firebase-sdk-B6LW5vFX.js | 718.9 |
| react-DGuoRYMU.js | 241.5 |
| vendor-B7S-wSum.js | 174 |
| flow-DU0J6mIM.js | 172.7 |
| EditorPage-Dd6UbSRu.js | 70.2 |
| index-CZfrqyD_.css | 55.5 |
| index-CphG3Huq.js | 32.8 |
| flow-CeJeskZg.css | 10.9 |
| Dashboard-nbQW4XzB.js | 9.5 |
| Login-BIvKKiHy.js | 4.8 |
| ShareDialog-DXwpWe_3.js | 4.7 |
| Inspector-C8q2H0_k.js | 4.6 |
| AccountMenu-Du212a5u.js | 2.9 |
| firebase-BTVxYk56.js | 0.8 |
| NotFound-23xYWHQx.js | 0.7 |
| rolldown-runtime-XKyaHtl9.js | 0.7 |
