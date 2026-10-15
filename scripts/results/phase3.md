# Perf: phase3 (2026-10-15T23:22:20.494Z)

| nodes | gesture | frame mean | frame p95 | frame max | frames >20ms | input→paint p95 | script | style | layout | paint | raster | IdeaNode renders |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 5 | pan | 16.67 | 16.8 | 16.8 | 0% | <16 | 131 | 12 | 24 | 25 | 54 | 1 |
| 5 | zoom | 16.67 | 16.8 | 16.8 | 0% | <16 | 81 | 11 | 9 | 21 | 857 | 1 |
| 5 | drag | 16.67 | 16.7 | 16.8 | 0% | <16 | 238 | 18 | 15 | 55 | 51 | 2 |
| 5 | drag-branch (3 ideas) | 16.67 | 16.8 | 16.8 | 0% | <16 | 229 | 25 | 15 | 61 | 55 | 2 |
| 100 | pan | 16.67 | 16.7 | 16.8 | 0% | <16 | 272 | 19 | 27 | 79 | 89 | 11 |
| 100 | zoom | 16.67 | 16.8 | 16.8 | 0% | <16 | 180 | 23 | 27 | 89 | 1474 | 95 |
| 100 | drag | 16.67 | 16.7 | 16.8 | 0% | <16 | 871 | 36 | 64 | 499 | 69 | 12 |
| 100 | drag-branch (27 ideas) | 16.67 | 16.7 | 16.8 | 0% | <16 | 863 | 63 | 46 | 424 | 138 | 2 |
| 500 | pan | 18.51 | 33.3 | 83.4 | 9% | <16 | 946 | 30 | 62 | 435 | 144 | 30 |
| 500 | zoom | 16.89 | 16.8 | 33.4 | 1% | <16 | 397 | 45 | 68 | 265 | 836 | 303 |
| 500 | drag | 19.29 | 33.4 | 83.3 | 8% | <16 | 3335 | 77 | 263 | 2109 | 366 | 52 |
| 500 | drag-branch (71 ideas) | 17.09 | 16.8 | 66.7 | 2% | <16 | 3467 | 279 | 304 | 2085 | 474 | 12 |

Frame times in ms from requestAnimationFrame deltas; script/style/layout/paint/raster are total ms of trace work during the gesture (~1 s of input).

| nodes | typing mean ms | typing p95 ms | first node ms | DOMContentLoaded ms | DOM elements | rendered nodes |
|---|---|---|---|---|---|---|
| 5 | 16.73 | 24 | 480 | 80 | 164 | 5 |
| 100 | 19.33 | 32 | 515 | 56 | 1246 | 105 |
| 500 | 30.8 | 48 | 694 | 80 | 4371 | 385 |

| bundle file | kB |
|---|---|
| firebase-D03EWdHt.js | 550.5 |
| react-Y8u4CMjP.js | 241.5 |
| flow-CsN1_EZQ.js | 187.2 |
| index-iZY8d4sZ.js | 86.4 |
| EditorPage-CQ9-c4XQ.js | 56.3 |
| index-HP0WyoyC.css | 55.9 |
| AccountMenu-Dr_dXcXx.js | 45.6 |
| flow-CeJeskZg.css | 10.9 |
| Landing-BYEKYqxT.js | 9.6 |
| icons-DcbKmKms.js | 7.8 |
| Login-DH_L1bwf.js | 4.8 |
| store-De4bobEx.js | 4.8 |
| Dashboard-CsmEHYa_.js | 4.6 |
| ShareDialog-DmYp3Kkj.js | 4.5 |
| Inspector-DWzkINH1.js | 3.8 |
| Logo-UuKCpZ0c.js | 0.9 |
| rolldown-runtime-XKyaHtl9.js | 0.7 |
