# Perf: baseline-final (2026-10-16T06:06:07.167Z)

| nodes | gesture | frame mean | frame p95 | frame max | frames >20ms | main-thread ms/frame | script | style | layout | paint | raster | IdeaNode renders |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 5 | pan | 17.05 | 16.8 | 33.4 | 2% | – | 144 | 16 | 19 | 54 | 2892 | 0 |
| 5 | zoom | 16.67 | 16.7 | 16.8 | 0% | – | 52 | 7 | 8 | 17 | 833 | 0 |
| 5 | drag | 16.86 | 16.8 | 33.3 | 1% | 3.7 | 792 | 26 | 47 | 105 | 196 | 1839 |
| 5 | drag-branch (3 ideas) | 16.76 | 16.8 | 33.3 | 1% | – | 746 | 31 | 28 | 108 | 201 | 2159 |
| 100 | pan | 17.28 | 16.8 | 49.9 | 3% | – | 343 | 78 | 43 | 143 | 3193 | 0 |
| 100 | zoom | 16.67 | 16.8 | 16.8 | 0% | – | 110 | 8 | 20 | 42 | 1371 | 0 |
| 100 | drag | 18.83 | 33.3 | 66.7 | 11% | 7.8 | 5935 | 38 | 99 | 1481 | 291 | 37748 |
| 100 | drag-branch (27 ideas) | 17.83 | 33.3 | 50.1 | 6% | 7.8 | 4406 | 91 | 96 | 1147 | 518 | 32030 |
| 500 | pan | 18.35 | 33.3 | 49.9 | 10% | 13.2 | 766 | 51 | 150 | 667 | 3660 | 0 |
| 500 | zoom | 16.95 | 16.7 | 33.4 | 2% | 9.7 | 276 | 11 | 62 | 252 | 1463 | 0 |
| 500 | drag | 40.57 | 116.7 | 233.3 | 40% | 20.3 | 23427 | 48 | 323 | 4429 | 259 | 210107 |
| 500 | drag-branch (83 ideas) | 39.3 | 116.7 | 250 | 38% | 19.6 | 23769 | 271 | 430 | 3907 | 1701 | 215471 |
| 1000 | pan | 32.52 | 66.7 | 133.3 | 43% | 26.5 | 1414 | 61 | 348 | 1763 | 3795 | 0 |
| 1000 | zoom | 18.5 | 33.4 | 33.4 | 11% | 13.4 | 476 | 13 | 125 | 513 | 1341 | 0 |
| 1000 | drag | 73.25 | 250 | 466.8 | 50% | 36.8 | 46216 | 70 | 659 | 5091 | 264 | 471009 |
| 1000 | drag-branch (184 ideas) | 146.01 | 283.4 | 533.2 | 99% | 73.6 | 61677 | 585 | 880 | 5232 | 2525 | 480187 |

Frame times in ms from requestAnimationFrame deltas. "main-thread ms/frame" is CPU work on the renderer main thread per animation frame (GPU-independent; under 16.7 means the main thread leaves headroom). script/style/layout/paint/raster are total ms of trace work during the gesture (~1 s of input); raster runs on worker threads and is software-rendered here.

| nodes | typing mean ms | typing p95 ms | first node ms | DOMContentLoaded ms | DOM elements | rendered nodes |
|---|---|---|---|---|---|---|
| 5 | 16.73 | 24 | 897 | 598 | 181 | 5 |
| 100 | 26.13 | 40 | 321 | 81 | 2171 | 105 |
| 500 | 32.4 | 80 | 783 | 103 | 10171 | 505 |
| 1000 | 106 | 192 | 1523 | 158 | 20171 | 1005 |

| bundle file | kB |
|---|---|
| index-D-W1n2OU.js | 1057.7 |
| index-H6QnGHwu.css | 43.8 |
