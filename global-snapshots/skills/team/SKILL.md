---
name: team
description: 使用 agent teams 方式執行用戶的任務。當用戶使用 /team 指令，或需要將複雜任務分解給多個 agent 平行執行時使用。適合耗時任務、多階段任務、或需要多個專業領域協作的情境。Use when user says "team", "parallel agents", "分工", "平行執行", "多 agent", "拆任務", "agent team".
---

# Team — Agent 團隊執行框架

## 概覽

將用戶的 prompt 分解為獨立子任務，組建 agent 團隊平行執行，最後整合結果。

## 執行流程

### Step 1：分析任務

讀取用戶的 prompt，判斷：
- 可以拆成哪些獨立子任務？
- 每個子任務需要什麼能力（研究/寫程式/測試/設計）？
- 任務之間的依賴關係為何？

### Step 2：建立團隊

```
TeamCreate：
  team_name: "task-[簡短描述]-[mmdd]"
  description: [任務說明]
```

### Step 3：建立任務清單

用 `TaskCreate` 為每個子任務建立 Task，填寫：
- `subject`：簡短指令式標題
- `description`：詳細說明 + 驗收標準
- `activeForm`：進行中的現在分詞

若任務有依賴，用 `TaskUpdate` 設定 `addBlockedBy`。

### Step 4：派發 Agents

用 `Task` tool（subagent_type）同時啟動所有無依賴的子任務 agents，每個 agent 的 prompt 包含：
1. 分配給它的 task ID 與 subject
2. 具體執行說明
3. 完成後用 `TaskUpdate` 標記 completed
4. 若需回報結果，用 `SendMessage` 傳給 team-lead（你自己）

同時啟動多個 agents（單一 message 多個 tool calls）。

### Step 5：監控與協調

- 等待 agents 回報完成
- 解除被阻擋任務的依賴後，立刻啟動下一批 agents
- 若 agent 遇到問題，釐清後重新派發或調整方向

### Step 6：整合結果

收集所有 agents 的輸出，整合成一份完整結果回報給用戶。

### Step 7：Cleanup 與關閉團隊

所有任務完成後：
1. 傳 `SendMessage(type: "shutdown_request")` 給仍在等待的 agents
2. 使用 `TaskList` 確認所有 task 狀態為 `completed` 或 `deleted`
3. 若有遺留的 `in_progress` task，檢查對應 agent 是否仍在運行：
   - 仍在運行 → 等待完成或送 shutdown_request
   - 已無回應 → 用 `TaskUpdate` 標記為 `deleted`，記錄原因
4. `TeamDelete` 清理資源
5. 向用戶回報最終整合結果

> **Cleanup 原則**：不要讓 orphan task 殘留。每次 team session 結束前，確保 task list 是乾淨的。

## Subagent 類型選擇

### 決策樹

選擇 subagent_type 時，依照以下決策流程：

```
任務是否需要修改檔案？
├─ 否 → 任務是否需要搜尋/閱讀大量程式碼？
│       ├─ 是 → Explore
│       └─ 否 → 任務是否需要產出計畫/架構？
│               ├─ 是 → Plan
│               └─ 否 → general-purpose
└─ 是 → 修改的是什麼類型的檔案？
        ├─ iOS Swift / SwiftUI → mobile-app-builder
        ├─ React / Next.js / CSS / 前端 → frontend-developer
        ├─ NestJS / API / Prisma / 後端 → backend-architect
        ├─ 測試檔案（*.test.ts, *.spec.ts, *Tests.swift） → test-writer-fixer
        ├─ 需要 debug / 問題診斷 → gsd-debugger
        └─ 其他 / 混合 → general-purpose
```

### 類型對照表

| 任務類型 | subagent_type | 適用情境 |
|---------|---------------|----------|
| 研究、探索、搜尋 | `Explore` | 需要 Glob/Grep 大量檔案、理解架構、找特定程式碼 |
| 架構規劃 | `Plan` | 產出實作計畫、設計方案、遷移策略 |
| 寫程式/修改檔案 | `general-purpose` | 通用程式修改、跨領域任務、混合類型 |
| 問題診斷 | `gsd-debugger` | Bug 定位、錯誤分析、log 追蹤 |
| 前端開發 | `frontend-developer` | React、Next.js、CSS、UI 元件 |
| 後端開發 | `backend-architect` | NestJS、API endpoint、Prisma schema、tRPC |
| iOS 開發 | `mobile-app-builder` | Swift、SwiftUI、iOS 專案、pbxproj 修改 |
| 程式碼審查 | `feature-dev:code-reviewer` | PR review、code quality 檢查 |
| 測試撰寫 | `test-writer-fixer` | Jest、Vitest、XCTest、Playwright |

> **原則**：選擇最具體的 subagent_type。`general-purpose` 是 fallback，非預設選擇。

## Agent 失敗處理流程

當 agent 回報錯誤、長時間無回應、或產出不符預期時：

### 失敗分級與處理

| 失敗類型 | 判斷依據 | 處理方式 |
|----------|----------|----------|
| **Build/Compile 錯誤** | Agent 回報編譯失敗 | 提供錯誤訊息，請 agent 修復；連續 3 次失敗 → 接管或換 agent |
| **任務理解錯誤** | Agent 產出與預期不符 | 釐清需求後重新派發，附上更具體的指令 |
| **Agent 無回應** | 超過 5 分鐘無 TaskUpdate 或 SendMessage | 檢查 TaskList 狀態；若仍 in_progress → 送提醒訊息；再 5 分鐘無回應 → 標記 task deleted，重新派發新 agent |
| **衝突 / 資源競爭** | 兩個 agent 修改同一檔案 | 立即停止其中一個，序列化執行，或合併變更 |
| **Context 耗盡** | Agent 回報 context 壓縮或截斷 | 將剩餘工作拆成更小的子任務，派發新 agent |

### 重試策略

1. **第一次失敗**：補充上下文或修正指令，請同一 agent 重試
2. **第二次失敗**：分析失敗原因，調整任務拆分方式，派發新 agent
3. **第三次失敗**：team-lead 自行接管該子任務，或向用戶回報需要人工介入

> **禁止無限重試**：同一任務最多重試 2 次（共 3 次嘗試）。超過後必須升級處理。

## 注意事項

- **最多同時 5–7 個 agents**，等一批完成再啟動下一批
- Agents 去 idle 是正常現象，不代表失敗
- 結果只對你（team lead）可見，需主動整合後回報用戶
- 不要用 JSON 格式傳訊息給 teammates，用純文字
- 派發任務時，指令要具體且自包含（agent 看不到你的完整 context）
- 若多個 agent 需要修改同一檔案，必須序列化（用 `addBlockedBy` 設定依賴）
