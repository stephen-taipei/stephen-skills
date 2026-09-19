#!/usr/bin/env node
/**
 * JS baseline vs Rust/WASM candidate 的對照量測 harness。
 *
 * 重要限制：這支腳本在 Node 執行，量得到「WASM 本身快多少」，
 * 量不到 Worker 通訊成本，也量不到主執行緒阻塞。
 * 那兩項必須在瀏覽器實測 —— 見 references/benchmarking.md。
 *
 * 用法:
 *   node bench.mjs --config .review-rust-wasm/bench.config.json \
 *                  --out .review-rust-wasm/benchmark.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, extname, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { hrtime } from 'node:process';
import os from 'node:os';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const CONFIG_PATH = arg('config', '.review-rust-wasm/bench.config.json');
const OUT = arg('out', '.review-rust-wasm/benchmark.json');

if (!existsSync(CONFIG_PATH)) {
  console.error(`✗ 找不到設定檔：${CONFIG_PATH}`);
  console.error('  格式見 references/benchmarking.md');
  process.exit(1);
}

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
const CONFIG_DIR = dirname(resolve(CONFIG_PATH));

const resolveFrom = (p) => (isAbsolute(p) ? p : resolve(CONFIG_DIR, p));

// ── 載入 ──────────────────────────────────────────────────────────────

async function loadFn(spec, label) {
  if (!spec) return null;
  const modPath = resolveFrom(spec.module);
  if (!existsSync(modPath)) {
    throw new Error(`${label} 模組不存在：${modPath}`);
  }
  const mod = await import(pathToFileURL(modPath).href);
  const fn = spec.export ? mod[spec.export] : mod.default;
  if (typeof fn !== 'function') {
    throw new Error(`${label} 的匯出 "${spec.export ?? 'default'}" 不是函式（${modPath}）`);
  }
  return fn;
}

function loadFixture(caseDef) {
  if (caseDef.input !== undefined) return caseDef.input;
  if (!caseDef.fixture) return undefined;

  const p = resolveFrom(caseDef.fixture);
  if (!existsSync(p)) throw new Error(`fixture 不存在：${p}`);

  if (extname(p) === '.json') return JSON.parse(readFileSync(p, 'utf8'));
  return new Uint8Array(readFileSync(p));   // 其餘一律當二進位
}

/**
 * 每次迭代都要用全新的輸入副本。
 * 許多 WASM 介面是原地修改，共用同一份輸入會讓第二次之後測到的是已被改過的資料。
 */
function cloneInput(input) {
  if (input === undefined || input === null) return input;
  if (ArrayBuffer.isView(input)) return new input.constructor(input);
  if (input instanceof ArrayBuffer) return input.slice(0);
  if (Array.isArray(input)) return input.map(cloneInput);
  if (typeof input === 'object') return structuredClone(input);
  return input;
}

// ── 統計 ──────────────────────────────────────────────────────────────

const percentile = (sorted, p) => {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
};

const round = (n) => (n === null ? null : Math.round(n * 1000) / 1000);

function summarize(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    p50: round(percentile(sorted, 50)),
    p95: round(percentile(sorted, 95)),
    mean: round(samples.reduce((s, v) => s + v, 0) / samples.length),
    min: round(sorted[0]),
    max: round(sorted[sorted.length - 1]),
    samples: samples.length,
    unit: 'ms',
  };
}

async function measure(fn, input, args, iterations, warmup) {
  for (let i = 0; i < warmup; i++) await fn(cloneInput(input), ...args);

  const samples = [];
  for (let i = 0; i < iterations; i++) {
    const payload = cloneInput(input);
    const t0 = hrtime.bigint();
    await fn(payload, ...args);
    const t1 = hrtime.bigint();
    samples.push(Number(t1 - t0) / 1e6);
  }
  return summarize(samples);
}

// ── 執行 ──────────────────────────────────────────────────────────────

const iterations = config.iterations ?? 50;
const warmup = config.warmup ?? 10;

console.log(`Benchmark：${config.cases.length} 個情境，每個 ${warmup} 次暖身 + ${iterations} 次計時\n`);

const results = [];

for (const c of config.cases) {
  process.stdout.write(`  ${c.name} … `);

  try {
    const input = loadFixture(c);
    const args = c.args ?? [];

    const baselineFn = await loadFn(c.baseline, 'baseline');
    const candidateFn = await loadFn(c.candidate, 'candidate');

    const baseline = baselineFn ? await measure(baselineFn, input, args, iterations, warmup) : null;
    const candidate = candidateFn ? await measure(candidateFn, input, args, iterations, warmup) : null;

    const speedup =
      baseline && candidate && candidate.p50 > 0
        ? round(baseline.p50 / candidate.p50)
        : null;

    results.push({
      name: c.name,
      fixture: c.fixture ?? 'inline',
      iterations,
      warmup,
      baseline,
      candidate,
      speedup,
      verified: true,
      method: 'Node harness（不含 Worker 通訊與主執行緒阻塞，須另於瀏覽器實測）',
    });

    console.log(
      baseline && candidate
        ? `baseline p50 ${baseline.p50}ms → candidate p50 ${candidate.p50}ms（${speedup}x）`
        : 'done',
    );
  } catch (err) {
    console.log(`✗ ${err.message}`);
    results.push({
      name: c.name,
      error: err.message,
      verified: false,
      method: 'Node harness',
    });
  }
}

const output = {
  environment: {
    date: new Date().toISOString().slice(0, 10),
    machine: `${os.cpus()[0]?.model ?? 'unknown'} × ${os.cpus().length}, ${Math.round(os.totalmem() / 1024 ** 3)}GB`,
    os: `${os.type()} ${os.release()}`,
    node: process.version,
    browser: null,
  },
  note: 'Node 環境量測結果。Worker 通訊成本與主執行緒阻塞需在瀏覽器另行實測後補入。',
  cases: results,
};

mkdirSync(dirname(resolve(OUT)), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(output, null, 2)}\n`);

const failed = results.filter((r) => r.error).length;
console.log(`\n已寫入 ${OUT}`);
if (failed) console.log(`⚠️  ${failed} 個情境失敗，已標記 verified:false`);
console.log('⚠️  主執行緒阻塞與 Worker 通訊成本尚未量測，須在瀏覽器補測。');

process.exit(failed === results.length ? 1 : 0);
