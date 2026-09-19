# Benchmark 方法

沒有量測就沒有驗收。這份文件定義怎麼量才算數。

---

## 要量兩個不同的東西

改造前後最重要的差異有兩個面向，**只報其中一個都是誤導**：

| 指標 | 意義 | 改造後預期 |
|------|------|-----------|
| **端到端耗時** | 使用者從觸發到看到結果的總時間 | 通常下降；但若 WASM 加速有限，可能因 Worker 通訊而**略微上升** |
| **主執行緒阻塞時間** | 使用者感受到的「卡頓」 | **應趨近於 0** —— 這是 Worker 化的主要價值 |

典型結果會是這樣：

```
原 JS 同步版：     端到端 820ms，主執行緒阻塞 820ms  ← 整段畫面凍結
WASM + Worker：    端到端 190ms，主執行緒阻塞 4ms    ← 畫面全程可互動
```

即使端到端只快一點點，**主執行緒阻塞從 820ms 降到 4ms 本身就是巨大的體驗改善**。報告要把這兩個數字分開列，不要混為一談。

---

## 量測原則

### 必須固定的變因

- **同一台機器**、同一次工作階段（不同機器的數字不可比）
- **同一組 fixture**、同一批次大小
- 關掉其他耗 CPU 的程式；筆電接電源（省電模式會降頻）
- 瀏覽器實測時關閉擴充功能（用無痕或乾淨 profile）

### 暖身

JIT 需要暖身，WASM 需要編譯與實例化。**先跑 5–10 次不計時的暖身回合**，再開始正式計時，否則第一次的編譯成本會污染整體數字。

### 樣本數

每個情境至少 **30 次**，取分佈而非單一數值。

### 看 p95，不要只看平均

平均值會被少數極端值拉扯，也會掩蓋抖動。**p95 才反映使用者實際會遇到的糟糕情況**。三個都記錄：p50、p95、平均。

---

## 量主執行緒阻塞

### 方法 A：Long Task API（最直接）

```js
const longTasks = [];
const observer = new PerformanceObserver((list) => {
  longTasks.push(...list.getEntries().map((e) => ({
    start: e.startTime,
    duration: e.duration,
  })));
});
observer.observe({ entryTypes: ['longtask'] });

// ... 執行目標操作 ...

observer.disconnect();
const count = longTasks.length;
const tbt = longTasks.reduce((sum, t) => sum + Math.max(0, t.duration - 50), 0);
```

`longtask` 只記錄 > 50ms 的任務。**TBT（Total Blocking Time）** 是每個 long task 超過 50ms 的部分加總，直接對應使用者感受到的卡頓程度。

### 方法 B：掉格數

```js
let frames = 0;
const start = performance.now();
function tick() {
  frames++;
  if (performance.now() - start < 1000) requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
// 執行期間若 frames 明顯低於 60，代表主執行緒被卡住
```

比較改造前後在**計算執行期間**的 fps，最貼近使用者感受。

### 方法 C：Chrome DevTools MCP / Playwright trace

有這些工具時直接錄 performance trace，能同時拿到 long task、呼叫堆疊與 fps，證據力最強。

---

## 用 scripts/bench.mjs

腳本提供的是 harness，實際的 baseline 與 candidate 由你用 config 指定。

```json
// .review-rust-wasm/bench.config.json
{
  "iterations": 50,
  "warmup": 10,
  "cases": [
    {
      "name": "apply-filter-1080p",
      "fixture": "./fixtures/frame-1080p.bin",
      "baseline":  { "module": "./src/legacy/filter.js",  "export": "applyFilterJs" },
      "candidate": { "module": "./src/wasm/filter-node.js", "export": "applyFilterWasm" }
    }
  ]
}
```

```bash
node "$SKILL/scripts/bench.mjs" \
  --config .review-rust-wasm/bench.config.json \
  --out .review-rust-wasm/benchmark.json
```

**限制：`bench.mjs` 在 Node 跑，量得到純計算的差異，量不到 Worker 通訊成本與主執行緒阻塞。** 那兩項必須在瀏覽器實測。Node 的數字可以當作「WASM 本身快多少」的上界參考，不能當作最終效益。

---

## benchmark.json 格式

```json
{
  "environment": {
    "date": "2026-09-19",
    "machine": "MacBook Pro M3 Max, 36GB",
    "os": "macOS 15.6",
    "browser": "Chrome 141",
    "node": "v24.12.0"
  },
  "cases": [
    {
      "name": "apply-filter-1080p",
      "fixture": "1920x1080 RGBA, 8.3MB",
      "iterations": 50,
      "baseline":  { "p50": 812, "p95": 867, "mean": 820, "unit": "ms" },
      "candidate": { "p50": 186, "p95": 203, "mean": 190, "unit": "ms" },
      "mainThreadBlocking": {
        "baseline":  { "longTasks": 1, "tbt": 770 },
        "candidate": { "longTasks": 0, "tbt": 0 }
      },
      "verified": true,
      "method": "Chrome 141 實測，Playwright trace"
    }
  ]
}
```

`verified: false` 的項目，報告會自動標示為「未驗證」。**寧可標未驗證，也不要填一個沒量過的數字。**

---

## 常見量測錯誤

| 錯誤 | 後果 | 正確做法 |
|------|------|---------|
| 只跑一次 | 數字純屬運氣 | ≥ 30 次取分佈 |
| 沒暖身 | 把 JIT / WASM 編譯成本算進去 | 先跑 5–10 次暖身 |
| 只報平均 | 掩蓋抖動與尾端延遲 | 同時報 p50 / p95 |
| 批次大小不同 | 根本不是同一件事 | 固定 fixture 與批次 |
| 只量端到端 | 錯過 Worker 化的主要價值 | 同時量主執行緒阻塞 |
| 在 Node 量就下結論 | 漏掉通訊成本與阻塞行為 | 最終數字以瀏覽器實測為準 |
| 開著 DevTools 量 | DevTools 本身影響效能 | 量測時關閉，或用 trace 自動化 |
| 拿別台機器的數字比 | 不可比 | 同機器同工作階段 |

---

## 效益不如預期時

照實寫，並分析原因：

- **端到端變慢但阻塞降低** → 這通常仍值得，報告說明取捨即可
- **兩者都沒明顯改善** → 建議回退。檢查是不是跨界開銷主導（介面設計問題）或原本瓶頸就不在計算（step 1 判定失誤）
- **結果不穩定、抖動大** → 先查是不是量測環境有干擾，排除後再下結論

**效益是負的也要寫進報告。** 誠實的負面結果能阻止後續浪費，價值高於粉飾過的正面數字。
