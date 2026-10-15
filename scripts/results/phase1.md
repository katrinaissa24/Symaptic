# Perf: phase1 (2026-10-15T22:35:05.371Z)

| nodes | gesture | frame mean | frame p95 | frame max | frames >20ms | input→paint p95 | script | style | layout | paint | raster | IdeaNode renders |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 5 | pan | 16.67 | 16.8 | 16.8 | 0% | <16 | 54 | 17 | 0 | 28 | 140 | 0 |
| 5 | zoom | 16.67 | 16.7 | 16.8 | 0% | <16 | 36 | 9 | 1 | 18 | 1053 | 2 |
| 5 | drag | 16.67 | 16.8 | 16.8 | 0% | <16 | 310 | 24 | 39 | 94 | 79 | 1 |
| 100 | pan | 16.67 | 16.7 | 16.8 | 0% | <16 | 165 | 30 | 3 | 309 | 826 | 0 |
| 100 | zoom | 16.66 | 16.7 | 16.8 | 0% | <16 | 147 | 23 | 26 | 93 | 1483 | 81 |
| 100 | drag | 16.67 | 16.7 | 16.8 | 0% | <16 | 1030 | 57 | 78 | 909 | 221 | 6 |
| 500 | pan | 20.19 | 50 | 83.4 | 12% | <16 | 1053 | 66 | 95 | 1770 | 1550 | 45 |
| 500 | zoom | 17.03 | 16.8 | 33.4 | 2% | <16 | 336 | 44 | 76 | 305 | 826 | 345 |
| 500 | drag | 19.33 | 33.4 | 66.6 | 15% | <16 | 3728 | 151 | 332 | 3748 | 356 | 1 |

Frame times in ms from requestAnimationFrame deltas; script/style/layout/paint/raster are total ms of trace work during the gesture (~1 s of input).

| nodes | typing mean ms | typing p95 ms | first node ms | DOMContentLoaded ms | DOM elements | rendered nodes |
|---|---|---|---|---|---|---|
| 5 | 16 | 16 | 484 | 97 | 191 | 5 |
| 100 | 19.43 | 32 | 899 | 59 | 2178 | 105 |
| 500 | 22.8 | 32 | 904 | 76 | 7823 | 385 |

| bundle file | kB |
|---|---|
| firebase-C3ZPtGef.js | 549.8 |
| react-C2OlKoW0.js | 241.5 |
| flow-B3uW2M3R.js | 185.4 |
| EditorPage-Cw9gOKdu.js | 48 |
| index-CXnBli_V.js | 43.8 |
| index-CEX0V7uA.css | 32.4 |
| flow-CeJeskZg.css | 10.9 |
| Landing-BmThCk63.js | 9.5 |
| icons-EY4VrZJG.js | 6.1 |
| Login-CbPv-k_v.js | 4.7 |
| Dashboard-Dck4X2sS.js | 4.6 |
| ShareDialog-46xOVYEF.js | 4.4 |
| store-Qt7h4WYq.js | 3.8 |
| Inspector-DsVlFYzz.js | 3.6 |
| AccountMenu-BqYzoo2N.js | 1.7 |
| Logo-By2cIcEi.js | 0.9 |
| rolldown-runtime-XKyaHtl9.js | 0.7 |

## Re-run with 1000 nodes
| nodes | gesture | frame mean | frame p95 | frame max | frames >20ms | input→paint p95 | script | style | layout | paint | raster | IdeaNode renders |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 500 | pan | 19.3 | 49.9 | 83.4 | 8% | <16 | 1026 | 65 | 83 | 1633 | 1469 | 45 |
| 500 | zoom | 17.82 | 33.3 | 33.4 | 7% | <16 | 382 | 48 | 90 | 342 | 874 | 345 |
| 500 | drag | 19.62 | 33.4 | 66.7 | 16% | <16 | 3815 | 151 | 344 | 3718 | 398 | 1 |
| 1000 | pan | 21.48 | 66.6 | 99.9 | 16% | <16 | 1319 | 75 | 115 | 1920 | 1654 | 53 |
| 1000 | zoom | 17.89 | 33.3 | 33.4 | 7% | <16 | 354 | 42 | 74 | 368 | 649 | 347 |
| 1000 | drag | 22.76 | 50 | 100.1 | 28% | <16 | 4880 | 293 | 428 | 4195 | 701 | 39 |

Frame times in ms from requestAnimationFrame deltas; script/style/layout/paint/raster are total ms of trace work during the gesture (~1 s of input).

| nodes | typing mean ms | typing p95 ms | first node ms | DOMContentLoaded ms | DOM elements | rendered nodes |
|---|---|---|---|---|---|---|
| 500 | 24.8 | 32 | 1071 | 142 | 7823 | 385 |
| 1000 | 46 | 96 | 1126 | 164 | 7850 | 384 |

| bundle file | kB |
|---|---|
