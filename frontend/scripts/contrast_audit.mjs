import fs from 'fs';

function parseHsl(val) {
  const m = val.match(/hsl\(\s*([\d\.]+)(?:deg)?\s*[, ]\s*([\d\.]+)%\s*[, ]\s*([\d\.]+)%/);
  if (!m) return null;
  const h = parseFloat(m[1]);
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const mVal = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return [r + mVal, g + mVal, b + mVal];
}

function parseHex(val) {
  val = val.trim().replace(/^#/, '');
  if (val.length === 6) {
    return [parseInt(val.slice(0, 2), 16)/255, parseInt(val.slice(2, 4), 16)/255, parseInt(val.slice(4, 6), 16)/255];
  } else if (val.length === 3) {
    return [parseInt(val[0]+val[0], 16)/255, parseInt(val[1]+val[1], 16)/255, parseInt(val[2]+val[2], 16)/255];
  }
  return null;
}

function parseColor(val) {
  if (!val) return null;
  val = val.trim();
  if (val.startsWith('#')) return parseHex(val);
  if (val.startsWith('hsl')) return parseHsl(val);
  return null;
}

function luminance([r, g, b]) {
  const ch = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * ch(Math.max(0, Math.min(1, r))) +
         0.7152 * ch(Math.max(0, Math.min(1, g))) +
         0.0722 * ch(Math.max(0, Math.min(1, b)));
}

function contrast(c1, c2) {
  const l1 = luminance(c1);
  const l2 = luminance(c2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function parseCssTokens(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const tokens = {};
  const re = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    tokens[m[1]] = m[2].trim();
  }
  const resolved = {};
  for (const [k, v] of Object.entries(tokens)) {
    let curr = v;
    for (let i = 0; i < 5; i++) {
      const varMatch = curr.match(/^var\((--[\w-]+)\)$/);
      if (varMatch && tokens[varMatch[1]]) {
        curr = tokens[varMatch[1]];
      } else break;
    }
    resolved[k] = curr;
  }
  return resolved;
}

const files = [
  ['light', 'frontend/src/styles/themes/light.css'],
  ['dark', 'frontend/src/styles/themes/dark.css']
];

for (const [theme, path] of files) {
  const toks = parseCssTokens(path);
  console.log(`\n=== ${theme.toUpperCase()} THEME ===`);
  const pairs = [
    ['text-primary on bg-base', '--text-primary', '--bg-base', 7.0],
    ['text-primary on bg-surface', '--text-primary', '--bg-surface', 7.0],
    ['text-primary on bg-elevated', '--text-primary', '--bg-elevated', 7.0],
    ['text-secondary on bg-base', '--text-secondary', '--bg-base', 7.0],
    ['text-secondary on bg-surface', '--text-secondary', '--bg-surface', 7.0],
    ['text-secondary on bg-elevated', '--text-secondary', '--bg-elevated', 7.0],
    ['text-tertiary on bg-elevated', '--text-tertiary', '--bg-elevated', 7.0],
    ['text-muted on bg-elevated', '--text-muted', '--bg-elevated', 7.0],
    ['input-border on input-bg (UI)', '--input-border', '--input-bg', 3.0],
    ['input-border-hover on input-bg (UI)', '--input-border-hover', '--input-bg', 3.0],
    ['danger-text on danger-bg', '--danger-text', '--danger-bg', 4.5],
    ['warning-text on warning-bg', '--warning-text', '--warning-bg', 4.5],
    ['success-text on success-bg', '--success-text', '--success-bg', 4.5],
    ['info-text on info-bg', '--info-text', '--info-bg', 4.5]
  ];

  for (const [name, fgKey, bgKey, req] of pairs) {
    const fgVal = toks[fgKey];
    const bgVal = toks[bgKey];
    const cFg = parseColor(fgVal);
    const cBg = parseColor(bgVal);
    if (!cFg || !cBg) {
      console.log(`UNPARSED: ${name} (${fgKey}=${fgVal}, ${bgKey}=${bgVal})`);
      continue;
    }
    const cr = contrast(cFg, cBg);
    const pass = cr >= req;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}: ${cr.toFixed(2)}:1 (req ${req}:1) [fg: ${fgVal}, bg: ${bgVal}]`);
  }
}
