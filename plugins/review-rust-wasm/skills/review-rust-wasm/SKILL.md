---
name: review-rust-wasm
description: Find CPU-bound JavaScript/TypeScript hot paths worth porting to Rust + WebAssembly, port the ones the user picks, run them in a Web Worker so the main thread stays responsive, benchmark before/after, and produce a PDF acceptance report. Use when the user asks which logic could benefit from Rust or WASM, reports page jank, freezing, long tasks or blocked UI during computation, wants to move heavy work off the main thread, or says things like "哪些邏輯適合改用 rust/wasm"、"頁面卡頓"、"運算很慢"、"效能優化"、"搬到 web worker"、"不要阻塞畫面".
license: MIT
compatibility: Requires Node.js 18+. Steps 3-5 additionally need the Rust toolchain and wasm-pack. Step 6 needs Playwright or a local Chrome/Chromium for PDF rendering.
---

# Review Rust/WASM

把 JS/TS 前端中**真正值得**的 CPU-bound 熱點搬到 Rust + WebAssembly，放進 Web Worker 背景執行，量測前後差異，最後產出 PDF 驗收報告。

## 四條不可妥協的原則

1. **效益必須量測，不得只估算。** 報告中每個效能數字都要標明來源是 `實測` 還是 `估算`。沒測到就寫「未驗證」，不要填一個好看的預估值 —— 那會讓驗收報告失去驗收能力。
2. **等價性優先於效能。** 先備妥黃金測資與等價測試，確認 Rust 版與原 JS 版輸出一致，才談速度。算得快但算錯的版本沒有價值。
3. **一定要有 fallback。** WASM 或 Worker 不可用時（舊瀏覽器、CSP 限制、載入失敗、SSR 階段）必須自動退回原 JS 實作，不能讓功能直接壞掉。
4. **反指標命中就排除。** 不是所有慢的東西都適合 WASM。被排除的項目也要列進清單並寫明原因 —— 這和列出可做的項目一樣有價值，能防止做白工。

## 語言

**用戶用什麼語言提問，就用什麼語言**產出候選清單、過程對話與最終 PDF。這條貫穿全部六個步驟。

## 路徑約定

本文件中的 `$SKILL` 指本 skill 的目錄（含 `SKILL.md`、`references/`、`scripts/`、`assets/`）。

- Claude Code 外掛安裝：`${CLAUDE_PLUGIN_ROOT}/skills/review-rust-wasm`
- 其他情況：從本檔案所在位置推導，或 `find ~ -type d -name review-rust-wasm -path '*/skills/*' 2>/dev/null | head -1`

所有本機產出（候選清單、量測結果、報告）一律寫進目標專案的 `.review-rust-wasm/`，並提醒用戶把它加進 `.gitignore`。

---

## Step 1 — 掃描候選

1. **先辨識專案型態與建置工具**（Vite / webpack / Angular CLI / Next.js / Rollup / esbuild…）。這決定 step 3 的 wasm 載入方式與 step 4 的 Worker 打包語法，先確認可以少走冤枉路。順帶記錄套件管理器與 Node 版本。

2. **執行前篩腳本**取得熱點候選：

   ```bash
   node "$SKILL/scripts/scan-candidates.mjs" --root . --out .review-rust-wasm/candidates.json
   ```

   這是**靜態前篩，不是結論**。它會漏報也會誤報，每一項都必須由你親自讀過原始碼後判讀。

3. **逐項套用判定準則** —— 讀 `references/candidate-criteria.md`，對每個候選比對正面指標與反指標。反指標命中就排除，不要硬做。

4. **能實測就實測。** 若環境有 Chrome DevTools MCP 或 Playwright，實際載入頁面量一次 long task 與函式耗時，用實測數據佐證前篩結果。實測過的標 `實測`，只靠讀碼推估的標 `估算`。

5. **產出兩張表**，用用戶的語言：

   **建議改造**

   | # | 位置 | 現況做法 | 資料規模 | 為何適合 | 效益（標註實測/估算） | 改造成本 | 風險 |
   |---|------|---------|---------|---------|---------------------|---------|------|

   **已排除**

   | 位置 | 為何不做（命中哪條反指標） |
   |------|------------------------|

   沒有任何項目通過判定時，**直接說「這個專案目前不值得引入 Rust/WASM」並說明原因**，然後停止。這是合格的結論，不是失敗 —— 硬湊項目才是失敗。

---

## Step 2 — 用戶選取

用 `AskUserQuestion`（Claude Code）或等效的多選提問，把 step 1 的「建議改造」表以多選形式呈現，讓用戶勾選要動工的項目。

- 每個選項標明預估效益與改造成本，讓用戶能權衡。
- 用戶可以只選一項。**不要預設全選**。
- 用戶選完後，複述一次確認範圍再進 step 3。

---

## Step 3 — 移至 Rust 並編譯為 WASM

詳細設定見 `references/rust-wasm-setup.md`。順序不可顛倒：

1. **先抽黃金測資。** 從真實程式路徑錄下具代表性的輸入與對應輸出，存成 fixture。涵蓋一般情況、邊界值、空輸入、極端規模。
2. **先寫等價性測試。** 測試內容：同一組 fixture 餵給原 JS 實作與新 WASM 實作，輸出必須一致。此時 WASM 還不存在，測試會紅 —— 這是對的。
3. **實作 Rust。** `wasm-pack new` 或在專案內開 `crates/<name>/`，用 `wasm-bindgen` 導出介面。介面設計以 `references/rust-wasm-setup.md` 的跨界成本原則為準：批次進出、用 TypedArray、避免逐筆呼叫。
4. **編譯：**
   ```bash
   wasm-pack build --target web --release
   ```
5. **跑等價性測試直到全綠。** 沒全綠就不准進 step 4。
6. **保留原 JS 實作**，不要刪除。它同時是 fallback 與 benchmark 的對照組。

---

## Step 4 — 以 Web Worker 背景執行

詳細做法見 `references/worker-integration.md`。要點：

1. **WASM 在 Worker 內初始化**，主執行緒完全不碰 WASM 模組。
2. **介面保持同形。** 呼叫端原本是 `foo(input)`，改造後是 `await foo(input)`，其餘不變。呼叫端改動越小越好。
3. **用 Transferable 傳大資料。** `ArrayBuffer` / TypedArray 用 transfer 移交所有權，避免結構化複製把效益吃掉。
4. **實作 fallback 鏈**：WASM+Worker → 失敗則原 JS。Worker 建立失敗、WASM 載入失敗、SSR/無 `window` 環境，都要能自動退回且不拋錯。
5. **驗證主執行緒真的沒被阻塞**：改造後在執行期間 UI 要能持續互動（捲動、點擊、動畫不掉格）。這點要在 step 5 量化。

---

## Step 5 — Benchmark 前後對照

詳細方法見 `references/benchmarking.md`。**這一步不能跳過** —— 跳過的話 step 6 的報告就只剩估算值。

1. 用 `scripts/bench.mjs` 或專案既有的 benchmark 機制，在**同一台機器、同一組 fixture、同一批次大小**下量測：
   - 原 JS 同步版（baseline）
   - Rust/WASM + Worker 版
2. 至少記錄：**p50、p95、平均**，以及**主執行緒 long task 數量與總阻塞時間（TBT）**。
3. 每項跑足夠次數（建議 ≥ 30 次）取分佈，不要只跑一次。先跑暖身回合再開始計時。
4. 把結果寫進 `.review-rust-wasm/benchmark.json`。
5. **誠實記錄**：某項沒測到就標「未驗證」，效益不如預期就照實寫。效益是負的也要寫，並在報告建議是否回退。

---

## Step 6 — 產出 PDF 驗收報告

模板在 `$SKILL/assets/report-template.html`，渲染腳本在 `$SKILL/scripts/render-report.mjs`。

1. 彙整成 `.review-rust-wasm/report.json`，每個改造項目需包含：
   - **改了什麼** —— 檔案、函式、改造前後做法
   - **為什麼改** —— 命中哪些正面指標，原本的瓶頸是什麼
   - **預期效益** —— step 5 的實測數字；未驗證項目明確標示
   - **如何驗收** —— 可執行的驗收步驟（見下）
2. 渲染：
   ```bash
   node "$SKILL/scripts/render-report.mjs" \
     --data .review-rust-wasm/report.json \
     --out .review-rust-wasm/review-rust-wasm-report.pdf
   ```
3. **報告語言 = 用戶提問語言。** 在 `report.json` 的 `lang` 欄位指定。

### 驗收章節的要求

「如何驗收」必須是**別人照著做就能重現**的內容，不能是「效能有提升」這種無法驗證的句子。每項至少包含：

- **可執行的指令**（測試指令、benchmark 指令）
- **可量化的門檻**（例：`p95 從 820ms 降到 140ms 以下`、`long task 從 6 次降到 0 次`）
- **正確性檢查**（等價性測試全綠）
- **fallback 檢查**（停用 WASM 或 Worker 後功能仍正常）

---

## 常見誤判

| 情境 | 正確處理 |
|------|---------|
| 函式看起來很複雜，但單次只跑 2ms | 排除。跨界開銷會超過收益。 |
| 瓶頸其實在 API 等待或 DOM 重排 | 排除。WASM 幫不上忙，改議題到網路或渲染層。 |
| 大量字串處理且需頻繁跨 JS/WASM 邊界 | 通常排除。UTF-8 編解碼成本高，除非能一次批次處理。 |
| 邏輯重度依賴 JS 生態套件 | 排除或縮小範圍到純計算的核心部分。 |
| 改完發現比原本慢 | 照實寫進報告，建議回退，並分析是跨界開銷還是演算法問題。 |
