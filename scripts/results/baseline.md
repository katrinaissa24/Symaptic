# Perf: baseline (2026-10-15T22:18:04.671Z)

| nodes | gesture | frame mean | frame p95 | frame max | frames >20ms | input→paint p95 | script | style | layout | paint | raster | IdeaNode renders |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 5 | pan | 16.86 | 16.8 | 33.4 | 1% | <16 | 98 | 12 | 15 | 45 | 2151 | 0 |
| 5 | zoom | 16.67 | 16.8 | 16.8 | 0% | <16 | 41 | 6 | 6 | 16 | 671 | 0 |
| 5 | drag | 16.67 | 16.8 | 16.8 | 0% | <16 | 610 | 27 | 37 | 101 | 204 | 2138 |
| 100 | pan | 16.67 | 16.8 | 16.8 | 0% | <16 | 256 | 65 | 31 | 99 | 2436 | 0 |
| 100 | zoom | 16.8 | 16.8 | 33.2 | 1% | <16 | 81 | 7 | 16 | 31 | 1012 | 0 |
| 100 | drag | 17.65 | 33.3 | 33.4 | 6% | <16 | 4212 | 54 | 93 | 1091 | 386 | 41092 |
| 500 | pan | 20.01 | 33.4 | 66.6 | 18% | <16 | 699 | 32 | 133 | 262 | 2899 | 0 |
| 500 | zoom | 16.67 | 16.8 | 16.8 | 0% | <16 | 212 | 8 | 44 | 81 | 1063 | 0 |
| 500 | drag | 38.7 | 116.6 | 233.4 | 39% | <16 | 20076 | 193 | 385 | 5161 | 2336 | 211980 |

Frame times in ms from requestAnimationFrame deltas; script/style/layout/paint/raster are total ms of trace work during the gesture (~1 s of input).

| nodes | typing mean ms | typing p95 ms | first node ms | DOMContentLoaded ms | DOM elements | rendered nodes |
|---|---|---|---|---|---|---|
| 5 | 16 | 16 | 586 | 461 | 181 | 5 |
| 100 | 21.54 | 40 | 268 | 73 | 2171 | 105 |
| 500 | 25.2 | 88 | 826 | 81 | 10171 | 505 |

| bundle file | kB |
|---|---|
| index-D-W1n2OU.js | 1057.7 |
| index-H6QnGHwu.css | 43.8 |
# Lighthouse: baseline

| page | performance | accessibility | best practices | FCP | LCP | TBT | CLS | Speed Index |
|---|---|---|---|---|---|---|---|---|
| landing | 92 | 90 | 100 | 606 ms | 646 ms | 0 ms | 0.172 | 606 ms |
|  | failing audits: valid-source-maps, color-contrast, heading-order, landmark-one-main | | | | | | | |
| my-maps | 100 | 91 | 100 | 243 ms | 243 ms | 0 ms | 0.000 | 243 ms |
|  | failing audits: valid-source-maps, color-contrast | | | | | | | |
| editor-100 | 100 | 85 | 100 | 244 ms | 284 ms | 0 ms | 0.000 | 339 ms |
|  | failing audits: valid-source-maps, color-contrast, label, link-name | | | | | | | |
