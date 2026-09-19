#!/usr/bin/env node
/**
 * Rust/WASM 候選熱點「靜態前篩」。
 *
 * 這不是結論 —— 它讀不出資料規模，也讀不出實際耗時，會漏報也會誤報。
 * 輸出只是給人判讀用的候選起點，每一項都必須回去讀原始碼確認。
 *
 * 用法:
 *   node scan-candidates.mjs --root . --out .review-rust-wasm/candidates.json
 *   node scan-candidates.mjs --root ./src --min-score 3
 */

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'node:fs';
import { join, extname, relative, dirname } from 'node:path';

const SOURCE_EXT = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.vue', '.svelte']);

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.next', '.nuxt',
  '.svelte-kit', '.angular', 'target', 'pkg', 'vendor', '.cache', '.turbo',
  '.review-rust-wasm', '__snapshots__',
]);

const IGNORE_FILE = /\.(min|bundle|spec|test)\.[cm]?[jt]sx?$/;

/** 建置產物常帶後綴（dist-openapi、build-ssr…），需前綴比對而非精確比對。 */
const IGNORE_DIR_PREFIX = /^(?:dist|build|out|generated|__generated)/;

/** 關鍵字訊號：命中即加分。weight 越高代表越可能是 CPU-bound。 */
const SIGNALS = [
  { id: 'typed-array',   weight: 3, re: /\b(?:Uint8(?:Clamped)?Array|Uint16Array|Uint32Array|Int8Array|Int16Array|Int32Array|Float32Array|Float64Array|BigInt64Array|ArrayBuffer|DataView)\b/, hint: 'TypedArray／二進位資料，跨界成本低' },
  { id: 'pixel-api',     weight: 4, re: /\b(?:getImageData|putImageData|createImageData|texImage2D|readPixels)\b/,                                           hint: '像素級運算' },
  { id: 'audio',         weight: 3, re: /\b(?:AudioBuffer|getChannelData|AnalyserNode|createScriptProcessor|AudioWorklet)\b/,                                hint: '音訊處理' },
  { id: 'crypto-hash',   weight: 3, re: /\b(?:sha(?:1|256|512)|md5|hmac|pbkdf2|scrypt|bcrypt|encrypt|decrypt|cipher|signature)\b/i,                          hint: '加解密／雜湊' },
  { id: 'compression',   weight: 3, re: /\b(?:deflate|inflate|gzip|gunzip|compress|decompress|huffman|lz4|zstd)\b/i,                                         hint: '壓縮／解壓' },
  { id: 'matrix-math',   weight: 3, re: /\b(?:matrix|mat4|mat3|quaternion|determinant|eigen|convolve|convolution|fft|dft|transpose)\b/i,                     hint: '矩陣／訊號處理' },
  { id: 'geometry',      weight: 2, re: /\b(?:distance|intersect|bounding[Bb]ox|centroid|triangulat|tessellat|raycast|collision)\w*/,                        hint: '幾何運算' },
  { id: 'parser',        weight: 2, re: /\b(?:tokenize|tokenizer|lexer|parseBuffer|decodeFrame|readVarint|deserialize)\b/i,                                  hint: '剖析／解碼' },
  { id: 'graph-search',  weight: 3, re: /\b(?:dijkstra|astar|a_star|bfs|dfs|topologicalSort|shortestPath|minimumSpanning)\b/i,                               hint: '圖論／路徑搜尋' },
  { id: 'diff',          weight: 2, re: /\b(?:levenshtein|myersDiff|computeDiff|diffChars|diffLines|patienceDiff)\b/i,                                       hint: 'diff／相似度比對' },
  { id: 'heavy-sort',    weight: 2, re: /\.sort\s*\(\s*(?:function|\([^)]*\)\s*=>)/,                                                                         hint: '自訂比較器排序' },
  { id: 'array-chain',   weight: 1, re: /\.(?:map|filter|flatMap)\s*\([^)]*\)\s*\.\s*(?:map|filter|reduce|flatMap|sort)\s*\(/,                               hint: '鏈式陣列走訪（多趟）' },
  { id: 'reduce',        weight: 1, re: /\.reduce\s*\(/,                                                                                                      hint: '陣列聚合' },
];

/** CPU 密集的第三方套件 —— 常指向熱點所在。 */
const HEAVY_DEPS = {
  'crypto-js': '加解密純 JS 實作',
  'bcryptjs': '密碼雜湊純 JS 實作',
  'fuse.js': '模糊搜尋，資料量大時吃 CPU',
  'pdfjs-dist': 'PDF 解析與渲染',
  'jszip': '壓縮／解壓',
  'xlsx': '試算表解析',
  'tesseract.js': 'OCR，極度 CPU 密集',
  'd3-array': '大量資料聚合',
  'd3-scale': '大量資料換算',
  '@turf/turf': '地理空間運算',
  'ml-matrix': '矩陣運算',
  'simple-statistics': '統計運算',
  'three': '3D 幾何運算',
  'chart.js': '大資料集渲染計算',
};

// ── 參數 ──────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};
const ROOT = arg('root', '.');
const OUT = arg('out', null);
const MIN_SCORE = Number(arg('min-score', '2'));

// ── 掃描 ──────────────────────────────────────────────────────────────

function walk(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;   // 權限不足等狀況：跳過而非中斷整次掃描
  }

  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const skip =
        IGNORE_DIRS.has(entry.name) ||
        IGNORE_DIR_PREFIX.test(entry.name) ||
        entry.name.startsWith('.');
      if (!skip) walk(full, acc);
    } else if (SOURCE_EXT.has(extname(entry.name)) && !IGNORE_FILE.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

/**
 * 找出巢狀迴圈的起始行。
 * 以括號深度追蹤迴圈作用域，並略過字串與註解以降低誤判。
 */
function findNestedLoops(src) {
  const loopKeyword = /\b(for|while)\s*\(/g;
  const loopStarts = [];
  for (let m; (m = loopKeyword.exec(src)); ) loopStarts.push(m.index);
  if (loopStarts.length < 2) return [];

  // 逐字元掃描，維護 brace 深度並略過字串/註解
  const depthAt = new Array(src.length).fill(0);
  let depth = 0;
  let mode = 'code';   // code | line-comment | block-comment | string
  let quote = '';

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1];

    if (mode === 'code') {
      if (c === '/' && next === '/') { mode = 'line-comment'; }
      else if (c === '/' && next === '*') { mode = 'block-comment'; i++; }
      else if (c === '"' || c === "'" || c === '`') { mode = 'string'; quote = c; }
      else if (c === '{') depth++;
      else if (c === '}') depth--;
    } else if (mode === 'line-comment') {
      if (c === '\n') mode = 'code';
    } else if (mode === 'block-comment') {
      if (c === '*' && next === '/') { mode = 'code'; i++; }
    } else if (mode === 'string') {
      if (c === '\\') i++;
      else if (c === quote) mode = 'code';
    }
    depthAt[i] = depth;
  }

  // 迴圈的巢狀關係：depth 較深且位於前一個迴圈的區塊內
  const nested = [];
  const stack = [];
  for (const pos of loopStarts) {
    const d = depthAt[pos];
    while (stack.length && stack[stack.length - 1] >= d) stack.pop();
    if (stack.length >= 1) nested.push(pos);
    stack.push(d);
  }

  return nested.map((pos) => src.slice(0, pos).split('\n').length);
}

const lineOf = (src, index) => src.slice(0, index).split('\n').length;

function scanFile(path) {
  let src;
  try {
    src = readFileSync(path, 'utf8');
  } catch {
    return null;
  }
  if (src.length > 2_000_000) return null;   // 極大檔案多半是產生物

  const hits = [];
  let score = 0;

  for (const sig of SIGNALS) {
    const re = new RegExp(sig.re.source, sig.re.flags.includes('g') ? sig.re.flags : `${sig.re.flags}g`);
    const lines = new Set();
    for (let m; (m = re.exec(src)); ) {
      lines.add(lineOf(src, m.index));
      if (lines.size >= 5) break;
    }
    if (lines.size) {
      hits.push({ signal: sig.id, hint: sig.hint, lines: [...lines].sort((a, b) => a - b) });
      score += sig.weight;
    }
  }

  const nestedLines = findNestedLoops(src);
  if (nestedLines.length) {
    hits.push({
      signal: 'nested-loop',
      hint: '巢狀迴圈，複雜度隨資料量放大',
      lines: nestedLines.slice(0, 5),
    });
    score += 3 + Math.min(nestedLines.length - 1, 3);
  }

  if (!hits.length) return null;
  return { file: relative(ROOT, path) || path, score, signals: hits };
}

function scanDependencies(root) {
  const pkgPath = join(root, 'package.json');
  if (!existsSync(pkgPath)) return [];
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    return Object.keys(all)
      .filter((d) => HEAVY_DEPS[d])
      .map((d) => ({ package: d, version: all[d], why: HEAVY_DEPS[d] }));
  } catch {
    return [];
  }
}

// ── 執行 ──────────────────────────────────────────────────────────────

const files = walk(ROOT);
const candidates = files
  .map(scanFile)
  .filter((r) => r && r.score >= MIN_SCORE)
  .sort((a, b) => b.score - a.score);

const result = {
  scannedAt: new Date().toISOString(),
  root: ROOT,
  filesScanned: files.length,
  minScore: MIN_SCORE,
  disclaimer:
    '靜態前篩結果，非結論。無法判斷實際資料規模與執行耗時，會漏報也會誤報；每一項都必須回去讀原始碼確認，並盡可能實測佐證。',
  heavyDependencies: scanDependencies(ROOT),
  candidates,
};

if (OUT) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(result, null, 2)}\n`);
}

// 人類可讀摘要
console.log(`掃描 ${files.length} 個原始檔，命中 ${candidates.length} 個候選（門檻 score ≥ ${MIN_SCORE}）\n`);

for (const c of candidates.slice(0, 20)) {
  console.log(`  [${String(c.score).padStart(2)}] ${c.file}`);
  for (const s of c.signals) {
    console.log(`         ${s.signal} (L${s.lines.join(', L')}) — ${s.hint}`);
  }
}
if (candidates.length > 20) console.log(`  … 其餘 ${candidates.length - 20} 項見輸出檔`);

if (result.heavyDependencies.length) {
  console.log('\nCPU 密集套件：');
  for (const d of result.heavyDependencies) console.log(`  ${d.package}@${d.version} — ${d.why}`);
}

if (OUT) console.log(`\n已寫入 ${OUT}`);
console.log('\n⚠️  這是靜態前篩，不是結論。請逐項讀碼確認並盡可能實測。');
