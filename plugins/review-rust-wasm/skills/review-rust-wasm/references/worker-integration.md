# Web Worker 整合

目標：WASM 在背景執行緒跑，主執行緒全程可互動；呼叫端改動最小；任何一環失敗都能退回原 JS。

---

## 架構

```
主執行緒                          Worker 執行緒
─────────                        ──────────────
呼叫端程式碼
    │
    ▼
processData()  ──postMessage──▶  WASM 模組（在此初始化並執行）
（同形非同步介面）  ◀──結果────         │
    │                                 ▼
    │                            Rust 計算
    └─ 失敗時 fallback ──▶ 原 JS 實作（同執行緒）
```

**主執行緒完全不載入 WASM 模組。** 一旦在主執行緒 `init()`，編譯與實例化本身就會造成阻塞，等於白做。

---

## 建立 Worker

各建置工具的寫法不同，寫錯會在正式環境 404：

```js
// Vite / webpack 5 / Rollup —— 標準寫法
const worker = new Worker(
  new URL('./compute.worker.js', import.meta.url),
  { type: 'module' }
);
```

`new URL(..., import.meta.url)` 必須**字面寫在 `new Worker()` 裡**，不能先存成變數 —— 打包工具靠靜態分析找 worker 進入點，用變數會找不到。

Angular CLI：`ng generate web-worker <name>`，它會處理好 `tsconfig.worker.json`。

---

## 用 Comlink（推薦）

手寫 postMessage 協定要自己管 request id、錯誤傳遞、型別，容易寫錯。Comlink 約 1KB，把 Worker 包成 Promise 介面。

```bash
npm i comlink
```

### Worker 端

```js
// compute.worker.js
import * as Comlink from 'comlink';
import init, { apply_filter } from '../wasm/image-filter/image_filter.js';

let ready = null;

const api = {
  async applyFilter(pixels, width, height) {
    ready ??= init();     // 只初始化一次，後續呼叫共用
    await ready;

    apply_filter(pixels, width, height);   // 原地修改
    return Comlink.transfer(pixels, [pixels.buffer]);   // 移交所有權回主執行緒
  },
};

Comlink.expose(api);
```

### 主執行緒端

```js
// compute-client.js
import * as Comlink from 'comlink';
import { applyFilterJs } from './legacy/filter.js';   // 原 JS 實作，保留作 fallback

let remote = null;
let unavailable = false;

function getRemote() {
  if (unavailable) return null;
  if (remote) return remote;

  try {
    const worker = new Worker(
      new URL('./compute.worker.js', import.meta.url),
      { type: 'module' }
    );
    remote = Comlink.wrap(worker);
    return remote;
  } catch (err) {
    console.warn('[wasm] Worker 建立失敗，改用 JS 實作', err);
    unavailable = true;
    return null;
  }
}

/**
 * 對外介面：與原本的 applyFilter(pixels, w, h) 同形，只是改為 async。
 * WASM/Worker 任何一環失敗都會自動退回原 JS，不對外拋錯。
 */
export async function applyFilter(pixels, width, height) {
  const api = getRemote();
  if (!api) return applyFilterJs(pixels, width, height);

  try {
    return await api.applyFilter(
      Comlink.transfer(pixels, [pixels.buffer]),
      width,
      height,
    );
  } catch (err) {
    console.warn('[wasm] 執行失敗，改用 JS 實作', err);
    unavailable = true;     // 之後都不再嘗試，避免每次都付失敗成本
    return applyFilterJs(pixels, width, height);
  }
}
```

### 呼叫端的改動

```diff
- const result = applyFilter(pixels, w, h);
+ const result = await applyFilter(pixels, w, h);
```

**僅此而已。** 若改動不只這樣，代表介面設計得不夠同形，回頭調整包裝層而不是散佈改動到各處呼叫點。

---

## Transferable：避免複製吃掉效益

預設的 postMessage 會做結構化複製 —— 10MB 的 buffer 來回就是 20MB 的複製量，足以抵銷 WASM 的加速。

用 transfer 移交所有權，零複製：

```js
Comlink.transfer(pixels, [pixels.buffer])
```

**代價**：transfer 之後，**原本那一側的 buffer 會變成 detached（`byteLength === 0`）**，不能再存取。所以：

- 傳出去之後不要再讀原變數，改用回傳值
- 若原資料之後還要用，先 `slice()` 複製一份再傳

可 transfer 的型別：`ArrayBuffer`、`MessagePort`、`ImageBitmap`、`OffscreenCanvas`。

---

## SSR 與環境守門

Next.js / Angular Universal / Nuxt 在伺服器端沒有 `Worker` 也沒有 `window`：

```js
const canUseWorker =
  typeof window !== 'undefined' &&
  typeof Worker !== 'undefined' &&
  typeof WebAssembly !== 'undefined';

if (!canUseWorker) return applyFilterJs(pixels, width, height);
```

把這個判斷放進 `getRemote()` 最前面。

---

## CSP 注意事項

嚴格 CSP 會擋掉 WASM 編譯。需要：

```
script-src 'self' 'wasm-unsafe-eval';
worker-src 'self' blob:;
```

若環境的 CSP 無法放寬，fallback 鏈會讓功能照常運作（只是沒有加速）——**這正是堅持要有 fallback 的理由**。部署前確認一次正式環境的 CSP。

---

## 必測的三件事

### 1. 主執行緒真的沒被阻塞

改造後，在計算執行期間：

- 頁面可以捲動
- 按鈕可以點擊並有反應
- CSS 動畫不掉格

用 `requestAnimationFrame` 量掉格數，或在 Performance 面板確認執行期間主執行緒沒有 long task。這項要在 benchmark 量化。

### 2. fallback 真的會動

不能只在「一切正常」的情況下測。至少驗三種：

```js
// 模擬 Worker 不可用
globalThis.Worker = undefined;

// 模擬 WASM 載入失敗 —— 把 .wasm 路徑改錯或用 devtools 封鎖該請求

// 模擬執行期拋錯 —— 在 worker api 內暫時 throw
```

三種情況下功能都必須照常運作，只是慢一點。

### 3. 併發呼叫不會互相干擾

使用者快速連續操作時，多個請求會同時在途。確認：

- 結果不會錯置（A 的結果回給 B）
- 過期結果被丟棄（只認最後一次）

需要時在包裝層加請求序號，或用 AbortController 語意取消。

---

## 何時不需要 Comlink

計算是**單一函式、單一參數、低頻呼叫**時，手寫 postMessage 反而更輕：

```js
// worker
self.onmessage = async (e) => {
  await ready;
  const out = compute(e.data.input);
  self.postMessage({ id: e.data.id, out }, [out.buffer]);
};
```

但只要有第二個方法、或需要錯誤傳遞與併發控制，就用 Comlink —— 自己寫那層協定的 bug 成本高於 1KB。
