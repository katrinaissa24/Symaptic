#!/usr/bin/env node
// Extracts the light-theme colour tokens from src/styles/tokens.css into api/_tokens.json so the
// invite email (which can't read CSS variables) is generated from the same source of truth.
import { readFileSync, writeFileSync } from 'node:fs';
const css = readFileSync('src/styles/tokens.css', 'utf8');
const light = css.slice(css.indexOf(':root {'), css.indexOf(":root[data-theme='dark']"));
const tokens = {};
for (const m of light.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
  const [, name, value] = m;
  if (/^(color|palette)-/.test(name) && !value.includes('var(')) tokens[name] = value.trim();
}
writeFileSync('api/_tokens.json', JSON.stringify(tokens, null, 2) + '\n');
console.log(`api/_tokens.json: ${Object.keys(tokens).length} tokens`);
