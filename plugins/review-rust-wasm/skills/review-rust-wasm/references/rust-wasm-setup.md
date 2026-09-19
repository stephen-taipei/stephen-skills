# Rust → WASM 設定

## 前置檢查

```bash
rustc --version          # 沒有就 https://rustup.rs
wasm-pack --version      # 沒有就 cargo install wasm-pack
rustup target add wasm32-unknown-unknown
```

三者缺一都要先裝，**不要跳過直接寫 Rust**。

---

## 建立 crate

放在專案內，與前端原始碼同 repo：

```
your-project/
├── src/                     # 既有前端程式
└── crates/
    └── image-filter/        # 一個候選項目一個 crate
        ├── Cargo.toml
        └── src/lib.rs
```

### Cargo.toml

```toml
[package]
name = "image-filter"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"

[profile.release]
opt-level = 3
lto = true
codegen-units = 1
panic = "abort"      # 縮小體積；但會讓 panic 無法被 JS 捕捉，見下方「錯誤處理」
```

> `opt-level = "s"` 或 `"z"` 可換取更小體積。先用 `3` 求速度，體積有問題時再調並重新 benchmark。

---

## 介面設計 —— 跨界成本是第一考量

JS ↔ WASM 每次呼叫都有固定開銷，資料傳遞會發生複製。介面設計錯了，效益會被邊界吃光。

### 三條規則

**1. 批次進出，不要逐筆呼叫**

```rust
// ❌ 每個點呼叫一次 —— 一萬個點就是一萬次跨界
#[wasm_bindgen]
pub fn transform_point(x: f64, y: f64) -> Vec<f64> { /* ... */ }

// ⭕ 一次處理整批
#[wasm_bindgen]
pub fn transform_points(points: &[f64]) -> Vec<f64> { /* ... */ }
```

**2. 用數值 slice，不要用 JS 物件**

`&[u8]` / `&[f32]` / `&[f64]` 對應 JS 的 TypedArray，是最省的傳遞方式。
傳 `JsValue` 物件或字串陣列會觸發 serde 轉換與大量配置。

**3. 原地修改優於回傳新陣列**

```rust
// ⭕ 直接改寫呼叫端給的 buffer，省一次配置與複製
#[wasm_bindgen]
pub fn apply_filter_in_place(pixels: &mut [u8], width: u32, height: u32) {
    // ...
}
```

JS 端：

```js
const pixels = imageData.data;           // Uint8ClampedArray
wasm.apply_filter_in_place(pixels, w, h); // 直接改寫
ctx.putImageData(imageData, 0, 0);
```

---

## 陷阱：記憶體成長會讓 view 失效

WASM 線性記憶體成長時，JS 端持有的 TypedArray view 會**指向已被廢棄的 buffer**，讀到的是垃圾資料，而且不會報錯。

```js
// ❌ 危險：中間任何配置都可能觸發 memory grow，讓 view 失效
const view = new Uint8Array(wasm.memory.buffer, ptr, len);
wasm.do_something_that_allocates();
console.log(view[0]);   // 可能是垃圾值

// ⭕ 每次要用時重新建立 view
function currentView(ptr, len) {
  return new Uint8Array(wasm.memory.buffer, ptr, len);
}
```

**這個 bug 很難查**，因為它不會拋錯，只會偶爾算錯。設計介面時盡量讓 Rust 端自己管理記憶體，避免 JS 端長期持有指標。

---

## 錯誤處理

Rust panic 在 WASM 中預設會讓模組進入不可用狀態。兩個選擇：

**開發期**：加 `console_error_panic_hook`，把 panic 訊息導到 console。

```toml
[dependencies]
console_error_panic_hook = { version = "0.1", optional = true }

[features]
default = ["console_error_panic_hook"]
```

```rust
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}
```

**正式版**：可預期的錯誤用 `Result` 回傳，讓 JS 端能 catch。

```rust
#[wasm_bindgen]
pub fn process(data: &[u8]) -> Result<Vec<u8>, JsValue> {
    if data.is_empty() {
        return Err(JsValue::from_str("input is empty"));
    }
    Ok(do_work(data))
}
```

不要靠 panic 處理正常的錯誤流程。

---

## 建置

```bash
wasm-pack build --target web --release
```

`--target` 選擇：

| target | 用途 |
|--------|------|
| `web` | 原生 ES module，`import init from './pkg/xxx.js'`。**Worker 內首選** |
| `bundler` | 交給 webpack/Rollup 處理。Vite 需搭配 `vite-plugin-wasm` |
| `nodejs` | Node 環境（benchmark 的 baseline 對照可用） |

產出在 `pkg/`：`.wasm` 檔、JS glue、`.d.ts` 型別定義。**把 `pkg/` 加進 `.gitignore`**，改在建置流程中產生。

### 接上專案建置流程

在 `package.json` 加一步，避免有人忘記重編：

```json
{
  "scripts": {
    "build:wasm": "wasm-pack build crates/image-filter --target web --release --out-dir ../../public/wasm/image-filter",
    "build": "npm run build:wasm && vite build"
  }
}
```

---

## 等價性測試

**動手寫 Rust 之前先做這件事。**

### 1. 抽黃金測資

從真實程式路徑錄下輸入與輸出，涵蓋：

- 一般情況（真實資料）
- 邊界值（0、1、最大值、負數、NaN）
- 空輸入
- 極端規模（最大預期資料量）

```js
// fixtures/golden.json
[
  { "name": "typical",   "input": [...], "expected": [...] },
  { "name": "empty",     "input": [],    "expected": [] },
  { "name": "max-scale", "input": [...], "expected": [...] }
]
```

### 2. 寫測試（此時 WASM 還不存在，測試會紅，這是對的）

```js
import golden from './fixtures/golden.json';
import { processJs } from '../src/legacy/process.js';   // 原實作，保留
import { processWasm } from '../src/wasm/process.js';    // 新實作

describe('JS 與 WASM 等價性', () => {
  for (const c of golden) {
    it(`${c.name} 兩個實作輸出一致`, async () => {
      const js = processJs(c.input);
      const wasm = await processWasm(c.input);
      expect(Array.from(wasm)).toEqual(Array.from(js));
    });
  }
});
```

### 3. 浮點數比較

浮點運算在 Rust 與 JS 可能有極小差異（不同的最佳化、FMA 指令）。**整數與位元運算必須逐位相等**；浮點數用容差比較：

```js
expect(wasm[i]).toBeCloseTo(js[i], 10);   // 相對誤差
```

容差要設得夠緊。若差異大到需要放寬容差才過，那是**演算法移植有誤**，不是精度問題 —— 回去查。

### 4. 全綠才能進 Web Worker 整合

沒全綠就繼續修。效能改造建立在正確性之上。
