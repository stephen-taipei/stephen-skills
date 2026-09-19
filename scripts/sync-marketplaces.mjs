#!/usr/bin/env node
/**
 * 由 plugins/ 目錄產生兩份 marketplace 目錄檔，避免手動維護造成漂移。
 *
 *   .claude-plugin/marketplace.json   → Claude Code 讀取
 *   .agents/plugins/marketplace.json  → Codex CLI 讀取
 *
 * 單一真相來源：plugins/<name>/.claude-plugin/plugin.json
 * 選填補充：    plugins/<name>/marketplace.meta.json  ({ category, tags })
 *
 * 用法:
 *   node scripts/sync-marketplaces.mjs           # 產生 / 覆寫
 *   node scripts/sync-marketplaces.mjs --check   # 只檢查是否同步（CI 用，不寫檔）
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Marketplace 本身的識別資訊 —— 要改就改這裡。 */
const MARKETPLACE = {
  name: 'stephen-skills',
  displayName: "Stephen's Skills",
  description: "Stephen's reusable Agent Skills for Claude Code and Codex CLI.",
  version: '1.0.0',
  owner: { name: 'Stephen Chuang', email: 'kingkongbboy@gmail.com' },
};

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

function collectPlugins() {
  const pluginsDir = join(REPO_ROOT, 'plugins');
  if (!existsSync(pluginsDir)) return [];

  return readdirSync(pluginsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort()
    .map((name) => {
      const dir = join(pluginsDir, name);
      const manifestPath = join(dir, '.claude-plugin', 'plugin.json');
      if (!existsSync(manifestPath)) {
        throw new Error(`plugins/${name} 缺少 .claude-plugin/plugin.json`);
      }
      const manifest = readJson(manifestPath);
      if (manifest.name !== name) {
        throw new Error(
          `plugins/${name}/.claude-plugin/plugin.json 的 name 是 "${manifest.name}"，必須與目錄名一致`,
        );
      }

      const metaPath = join(dir, 'marketplace.meta.json');
      const meta = existsSync(metaPath) ? readJson(metaPath) : {};

      return { name, dir, manifest, meta };
    });
}

/** Claude Code：source 為相對 repo root 的路徑字串。 */
function buildClaudeCatalog(plugins) {
  return {
    $schema: 'https://anthropic.com/claude-code/marketplace.schema.json',
    name: MARKETPLACE.name,
    description: MARKETPLACE.description,
    version: MARKETPLACE.version,
    owner: MARKETPLACE.owner,
    plugins: plugins.map(({ name, dir, manifest, meta }) => ({
      name,
      description: manifest.description,
      version: manifest.version,
      author: manifest.author,
      source: `./${relative(REPO_ROOT, dir).split(/[\\/]/).join('/')}`,
      ...(meta.category ? { category: meta.category } : {}),
      ...(manifest.keywords ? { keywords: manifest.keywords } : {}),
    })),
  };
}

/** Codex CLI：source 為物件形式，policy 控制安裝行為。 */
function buildCodexCatalog(plugins) {
  return {
    name: MARKETPLACE.name,
    interface: { displayName: MARKETPLACE.displayName },
    plugins: plugins.map(({ name, dir, manifest, meta }) => ({
      name,
      description: manifest.description,
      source: {
        source: 'local',
        path: `./${relative(REPO_ROOT, dir).split(/[\\/]/).join('/')}`,
      },
      policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
      ...(meta.category ? { category: meta.category } : {}),
    })),
  };
}

function emit(relPath, data, check) {
  const abs = join(REPO_ROOT, relPath);
  const next = `${JSON.stringify(data, null, 2)}\n`;

  if (check) {
    const current = existsSync(abs) ? readFileSync(abs, 'utf8') : null;
    if (current !== next) {
      console.error(`✗ ${relPath} 與 plugins/ 不同步，請執行 node scripts/sync-marketplaces.mjs`);
      return false;
    }
    console.log(`✓ ${relPath} 已同步`);
    return true;
  }

  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, next);
  console.log(`✓ 已寫入 ${relPath}`);
  return true;
}

const check = process.argv.includes('--check');
const plugins = collectPlugins();

if (plugins.length === 0) {
  console.error('✗ plugins/ 底下找不到任何 plugin');
  process.exit(1);
}

const ok = [
  emit('.claude-plugin/marketplace.json', buildClaudeCatalog(plugins), check),
  emit('.agents/plugins/marketplace.json', buildCodexCatalog(plugins), check),
].every(Boolean);

console.log(`${check ? '檢查' : '同步'}完成：${plugins.length} 個 plugin（${plugins.map((p) => p.name).join(', ')}）`);
process.exit(ok ? 0 : 1);
