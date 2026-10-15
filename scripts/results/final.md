# Perf: final (2026-10-15T23:51:56.421Z)

| nodes | gesture | frame mean | frame p95 | frame max | frames >20ms | input→paint p95 | script | style | layout | paint | raster | IdeaNode renders |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 5 | pan | 16.77 | 16.7 | 33.4 | 1% | <16 | 227 | 24 | 19 | 30 | 68 | 1 |
| 5 | zoom | 16.67 | 16.7 | 16.8 | 0% | <16 | 96 | 14 | 11 | 25 | 790 | 3 |
| 5 | drag | 16.76 | 16.8 | 33.4 | 1% | <16 | 419 | 28 | 22 | 65 | 53 | 2 |
| 5 | drag-branch (3 ideas) | 16.67 | 16.7 | 16.8 | 0% | <16 | 374 | 34 | 22 | 64 | 49 | 2 |
| 100 | pan | 16.67 | 16.7 | 16.8 | 0% | <16 | 397 | 31 | 30 | 100 | 107 | 11 |
| 100 | zoom | 16.67 | 16.7 | 16.8 | 0% | <16 | 197 | 28 | 29 | 93 | 1248 | 98 |
| 100 | drag | 16.75 | 16.8 | 33.3 | 1% | <16 | 993 | 45 | 68 | 509 | 99 | 12 |
| 100 | drag-branch (27 ideas) | 16.67 | 16.7 | 16.8 | 0% | <16 | 1070 | 79 | 46 | 504 | 143 | 2 |
| 500 | pan | 19.02 | 33.4 | 66.7 | 10% | <16 | 1157 | 47 | 72 | 447 | 170 | 30 |
| 500 | zoom | 16.79 | 16.8 | 33.3 | 1% | <16 | 401 | 48 | 67 | 258 | 644 | 327 |
| 500 | drag | 18.12 | 33.2 | 83.4 | 5% | <16 | 3596 | 95 | 287 | 2157 | 291 | 41 |
| 500 | drag-branch (71 ideas) | 17.18 | 16.8 | 66.6 | 2% | <16 | 3820 | 348 | 320 | 2186 | 418 | 17 |
| 1000 | pan | 18.18 | 33.3 | 66.6 | 7% | <16 | 960 | 37 | 62 | 353 | 135 | 28 |
| 1000 | zoom | 16.67 | 16.7 | 16.8 | 0% | <16 | 403 | 46 | 68 | 259 | 596 | 363 |
| 1000 | drag | 18.27 | 33.3 | 83.4 | 5% | <16 | 3548 | 94 | 260 | 2085 | 326 | 42 |
| 1000 | drag-branch (184 ideas) | 19.06 | 33.4 | 83.3 | 12% | <16 | 4043 | 638 | 294 | 1850 | 536 | 3 |

Frame times in ms from requestAnimationFrame deltas; script/style/layout/paint/raster are total ms of trace work during the gesture (~1 s of input).

| nodes | typing mean ms | typing p95 ms | first node ms | DOMContentLoaded ms | DOM elements | rendered nodes |
|---|---|---|---|---|---|---|
| 5 | 21.78 | 40 | 489 | 91 | 189 | 5 |
| 100 | 25.71 | 48 | 507 | 58 | 1271 | 105 |
| 500 | 37.6 | 64 | 772 | 59 | 4396 | 385 |
| 1000 | 25.2 | 48 | 982 | 125 | 4484 | 387 |

| bundle file | kB |
|---|---|
| firebase-D03EWdHt.js | 550.5 |
| react-Y8u4CMjP.js | 241.5 |
| flow-CsN1_EZQ.js | 187.2 |
| index-DTSibWPG.js | 87.6 |
| usePageTitle-B6ASLOqL.js | 79.6 |
| EditorPage-DdvUedUl.js | 69.8 |
| index-33dY4mt1.css | 54.4 |
| Dashboard-CgXP6F5I.js | 11 |
| flow-CeJeskZg.css | 10.9 |
| viewport-CurIrv-T.js | 7.3 |
| AccountMenu-DCRlW9NQ.js | 5.5 |
| ShareDialog-TkHbHNVx.js | 5.1 |
| Landing-Hve64cx8.js | 5 |
| Login-dTWkwbWf.js | 4.9 |
| Inspector-B__rA-LV.js | 4.6 |
| MapThumb-CxgEl-xh.js | 3.4 |
| NotFound-CFaAeWl6.js | 1 |
| rolldown-runtime-XKyaHtl9.js | 0.7 |
| lock-YjNiEtTp.js | 0.4 |
| message-square-CVK1rOSD.js | 0.3 |
| arrow-right-CnVJo16o.js | 0.2 |
