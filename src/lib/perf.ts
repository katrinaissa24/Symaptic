/** Render counter read by scripts/perf.mjs. A no-op unless the harness installed window.__PERF__. */
export function perfCount(name: string) {
  const p = (window as unknown as { __PERF__?: { count(n: string): void } }).__PERF__;
  if (p) p.count(name);
}
