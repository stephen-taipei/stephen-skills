#!/usr/bin/env node
/**
 * 把 report.json 套進 HTML 模板並列印為 PDF。
 *
 * 渲染器優先序：Playwright → Puppeteer → 系統安裝的 Chrome/Chromium。
 * 三者皆無時會明確告知如何安裝，並保留產生好的 HTML 讓使用者自行列印。
 *
 * 用法:
 *   node render-report.mjs --data .review-rust-wasm/report.json \
 *                          --out  .review-rust-wasm/report.pdf
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = join(SKILL_DIR, 'assets', 'report-template.html');

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const DATA_PATH = arg('data', '.review-rust-wasm/report.json');
const OUT = resolve(arg('out', '.review-rust-wasm/review-rust-wasm-report.pdf'));
const KEEP_HTML = argv.includes('--keep-html');

// ── 讀取與驗證 ────────────────────────────────────────────────────────

if (!existsSync(DATA_PATH)) {
  console.error(`✗ 找不到報告資料：${DATA_PATH}`);
  process.exit(1);
}
if (!existsSync(TEMPLATE)) {
  console.error(`✗ 找不到模板：${TEMPLATE}`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
} catch (err) {
  console.error(`✗ report.json 解析失敗：${err.message}`);
  process.exit(1);
}

if (!Array.isArray(data.items)) {
  console.error('✗ report.json 缺少 items 陣列');
  process.exit(1);
}

const unverified = data.items.filter((i) => !i.verified);
const lang = data.lang || 'zh-TW';

// ── 組出可獨立開啟的 HTML ─────────────────────────────────────────────

const template = readFileSync(TEMPLATE, 'utf8');
// </script> 若出現在資料中會提前關閉標籤，需轉義
const payload = JSON.stringify(data).replace(/<\/script>/gi, '<\\/script>');
const html = template.replace(
  '<script>',
  `<script>window.__REPORT__ = ${payload};</script>\n<script>`,
);

const htmlPath = KEEP_HTML
  ? OUT.replace(/\.pdf$/i, '.html')
  : join(tmpdir(), `review-rust-wasm-${Date.now()}.html`);

mkdirSync(dirname(OUT), { recursive: true });
mkdirSync(dirname(htmlPath), { recursive: true });
writeFileSync(htmlPath, html);

// ── 渲染 ──────────────────────────────────────────────────────────────

const PDF_OPTS = {
  format: 'A4',
  printBackground: true,
  margin: { top: '16mm', bottom: '18mm', left: '14mm', right: '14mm' },
};

async function viaPlaywright() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
    await page.pdf({ path: OUT, ...PDF_OPTS });
  } finally {
    await browser.close();
  }
  return 'Playwright';
}

async function viaPuppeteer() {
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch();
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle0' });
    await page.pdf({ path: OUT, ...PDF_OPTS });
  } finally {
    await browser.close();
  }
  return 'Puppeteer';
}

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];

async function viaSystemChrome() {
  const bin = CHROME_PATHS.find((p) => existsSync(p));
  if (!bin) throw new Error('找不到系統安裝的 Chrome/Chromium');

  execFileSync(
    bin,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--no-pdf-header-footer',
      '--virtual-time-budget=8000',
      `--print-to-pdf=${OUT}`,
      pathToFileURL(htmlPath).href,
    ],
    { stdio: 'pipe', timeout: 90_000 },
  );

  if (!existsSync(OUT)) throw new Error('Chrome 未產生 PDF 檔');
  return `系統 Chrome (${bin.split('/').pop()})`;
}

const renderers = [
  ['Playwright', viaPlaywright],
  ['Puppeteer', viaPuppeteer],
  ['系統 Chrome', viaSystemChrome],
];

let renderedBy = null;
const failures = [];

for (const [name, fn] of renderers) {
  try {
    renderedBy = await fn();
    break;
  } catch (err) {
    failures.push(`${name}: ${err.message.split('\n')[0]}`);
  }
}

// ── 結果 ──────────────────────────────────────────────────────────────

if (!renderedBy) {
  console.error('✗ 沒有可用的 PDF 渲染器，以下都試過了：');
  for (const f of failures) console.error(`    ${f}`);
  console.error('\n  擇一安裝後重試：');
  console.error('    npm i -D playwright && npx playwright install chromium');
  console.error('    npm i -D puppeteer');
  console.error('    或安裝 Google Chrome');
  console.error(`\n  HTML 已保留，可自行用瀏覽器開啟並列印為 PDF：\n    ${htmlPath}`);
  process.exit(1);
}

console.log(`✓ PDF 已產生：${OUT}`);
console.log(`  渲染器：${renderedBy}`);
console.log(`  語言：${lang}　項目：${data.items.length} 個`);
if (KEEP_HTML) console.log(`  HTML：${htmlPath}`);

if (unverified.length) {
  console.log(`\n⚠️  ${unverified.length} 個項目標記為未驗證，報告中已加警示區塊：`);
  for (const i of unverified) console.log(`    - ${i.title}`);
  console.log('  未驗證項目不可作為驗收依據，建議補做 benchmark。');
}
