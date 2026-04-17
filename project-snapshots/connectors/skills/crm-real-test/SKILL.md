---
name: crm-real-test
description: 使用 Claude-in-Chrome 瀏覽器自動化在 CRM Web (crm-web) 執行全功能 QA 測試。以資深 QA 測試主管角色，測試所有頁面、路由、表單、CRUD 元件，含 API 交互、錯誤處理、響應式佈局，管理 GitHub issue 生命週期直到 build 成功為止。Use when user says "test crm", "qa crm", "crm-real-test", "測試 crm web".
---

# CRM Web 全功能 QA 測試

## 角色定位

你現在是 Web 最頂尖專業的資深 QA 測試主管。
必須以多種思維角度、針對各種可能情境，執行**正向測試**（happy path）與**反向測試**（edge case、錯誤輸入、邊界值、權限拒絕、網路異常等）。

## 測試環境

| 項目 | 值 |
|------|----|
| 測試網址 | https://dev.ctrs.app（對應 `dev` branch 的 Staging 環境）|
| 本機備用 | http://localhost:4200（需先執行 `pnpm nx serve crm-web`）|
| 測試帳號（Owner） | 從本機 secret store 載入到 `CONNECTORS_QA_EMAIL` |
| 密碼 | 從本機 secret store 載入到 `CONNECTORS_QA_PASSWORD` |
| 帳號類型 | TEAM - 月訂閱 會員 |
| 測試工具 | `mcp__claude-in-chrome__*`（Chrome only） |

> 執行前請先從本機 secret store / 未追蹤環境變數載入 `CONNECTORS_QA_EMAIL`、`CONNECTORS_QA_PASSWORD`，不要把實值寫進 repo、issue 或測試報告。

## Bug 嚴重度分級

| 等級 | 定義 | 範例 | 處理方式 |
|------|------|------|----------|
| **P0 Blocker** | 頁面白屏 / 無法登入 / 資料遺失 | 登入後跳空白頁、送出表單後資料消失 | 立即停止所有測試，修復後再繼續 |
| **P1 Critical** | 核心功能壞掉，有 JS error | CRUD 操作失敗、Modal 無法關閉 | 當次 session 修復，建立 issue |
| **P2 Major** | 功能部分異常，有 workaround | 搜尋結果不準、分頁計數錯 | 建立 issue，加 `pending`，繼續測試 |
| **P3 Minor** | UI 瑕疵、對齊問題、文字截斷 | 按鈕超出容器、tooltip 位置偏 | 建立 issue，加 `pending` |

## Console Error 嚴重度定義

每頁測試後必查 `mcp__claude-in-chrome__read_console_messages`，依以下分級處理：

| Console 類型 | 對應嚴重度 | 處理方式 |
|-------------|-----------|---------|
| **Error**（JS error、unhandled rejection、failed fetch） | **P1 Critical** | 建立 GitHub issue，當次 session 修復 |
| **Warning**（React key warning、prop-types warning、deprecation warning） | **P3 Minor** | 建立 GitHub issue，加 `pending` tag |
| **Deprecation**（API deprecation notice、library deprecation） | **Log only** | 記錄於測試報告，不建立 issue，除非影響功能 |

> **判斷原則**：若 Warning/Deprecation 直接導致功能異常，則升級為對應功能的嚴重度（P1/P2）。

## 測試資料重置（每次測試前必做）

**每次執行測試前必須從乾淨狀態開始，確保測試結果不受歷史資料干擾。**

### 重置步驟

```
1. 登入 https://dev.ctrs.app，帳號：$CONNECTORS_QA_EMAIL
2. 前往 /contacts → 全選所有聯絡人 → 批量刪除（清空至 0 筆）
3. 前往 /reminders → 刪除所有提醒
4. 前往 /posts → 刪除所有貼文
5. 前往 /events → 刪除所有活動
6. 前往 /subscription → 確認訂閱狀態：
   - 若無有效訂閱 → 執行升級 TEAM 月訂閱（此步驟同時測試升級流程）
   - 若已有訂閱 → 確認方案正確，跳過升級
```

### 訂閱升級依賴檢查（Gate）

**在 Step 6 完成後、Step 7 開始前，必須執行以下檢查：**

```
確認條件（全部通過才可繼續）：
✅ 訂閱狀態顯示為 TEAM 月訂閱（或更高方案）
✅ /subscription 頁面無 console error
✅ 帳號功能權限已生效（例如：可存取 /team、/automation 等 TEAM 專屬頁面）

若任一條件未通過：
❌ 暫停所有後續步驟（不啟動 sub-agent）
❌ 記錄失敗原因與 console log
❌ 通知用戶：「訂閱升級未成功，無法繼續測試。失敗原因：{具體描述}」
❌ 等待用戶確認或手動修復後再繼續
```

```
7. 新增測試聯絡人集（最少 5 筆）：
   - 聯絡人 A：完整資料（姓名、Email、電話、公司、備注）
   - 聯絡人 B：僅必填欄位
   - 聯絡人 C：名稱含特殊字元（e.g., "Test & Co. <User>"）
   - 聯絡人 D：長文字備注（500+ 字元）
   - 聯絡人 E：無 Email（測試 Email 非必填路徑）
8. 通知所有 sub-agent：測試資料已就緒，可開始測試
```

## 啟動流程

```
1. mcp__claude-in-chrome__tabs_context_mcp — 確認目前 tab 狀態
2. mcp__claude-in-chrome__tabs_create_mcp — 開新 tab
3. mcp__claude-in-chrome__navigate — 前往 https://dev.ctrs.app/login
4. 完成測試資料重置流程（見上方）

【Smoke Test — 60 秒快速驗證，確認核心路徑可用再展開全測】
5. 登入成功 → 確認 /dashboard 載入完成（無白屏、無 console error）
6. 前往 /contacts → 確認列表顯示，5 筆測試聯絡人可見
7. 新增聯絡人（填姓名+Email）→ 儲存 → 確認出現在列表
8. 前往 /reminders → 新增提醒 → 確認儲存成功
9. 登出 → 確認跳回 /login

若 Smoke Test 任一步驟失敗（P0 Blocker）→ 先修復，再通知 sub-agent 啟動
5'. 通知 sub-agent 啟動，開始並行測試
```

## 測試深度原則（Iron Rule）

**每個頁面測試必須做到「葉節點窮舉」：**

1. **進入每一個子路由** — 所有 `/path/:id`、`/path/new`、`/path/edit` 都要訪問
2. **觸發每一個 modal / dialog / drawer / toast** — 包含 confirm、error、success、empty state
3. **點擊每一個互動元件** — button、dropdown、checkbox、radio、toggle、tab、pagination、sort、filter
4. **填寫每一個表單欄位** — 正常值、空白、超長、特殊字元各測一次
5. **確認四種 UI 狀態** — loading（Suspense fallback）、success、error、empty 都要出現並驗證
6. **每頁測試後必查 console** — `mcp__claude-in-chrome__read_console_messages` 確認無 JS error / warning（依 Console Error 嚴重度定義分級處理）

**不符合以上標準的頁面不算測試完成，不得勾選 checklist。**

## 測試範圍（必須全部覆蓋）

> **P0**：業務關鍵，每次測試必須完成
> **P1**：重要功能，P0 完成後執行
> **Context 不足時的優先順序：P0 → P1**

### 認證流程（Guest Routes）`[P0]`
- [ ] `/login` — 登入（正確、錯誤密碼、空白、忘記密碼連結）
- [ ] `/register` — 註冊（正常、重複 Email、弱密碼、必填空白）
- [ ] `/forgot-password` — 忘記密碼（正確 Email、不存在 Email）
- [ ] `/reset-password` — 重設密碼（有效 token、過期 token、密碼不符）
- [ ] `/verify-email` — Email 驗證（有效、無效 token）
- [ ] `/auth/callback` / `/auth/error` — OAuth 回調成功 / 失敗

### 主功能頁面（Protected Routes）

測試每個頁面時，依「測試深度原則」窮舉所有子元件、dialog、互動，**不得只停留在列表第一層**。

- [ ] `/dashboard` — 儀表板（所有圖表、快捷按鈕、數據卡片） `[P0]`
- [ ] `/contacts` — 聯絡人列表（搜尋、排序、篩選、分頁、空列表） `[P0]`
- [ ] `/contacts/new` — 新增聯絡人（完整表單、必填驗證、取消） `[P0]`
- [ ] `/contacts/:id` — 聯絡人詳情（所有 tab、編輯、刪除、互動記錄） `[P0]`
- [ ] `/contacts/:id/edit` — 編輯聯絡人（修改各欄位、儲存、取消） `[P0]`
- [ ] `/reminders` — 提醒事項（新增、編輯、完成、刪除、重複設定） `[P0]`
- [ ] `/feed` — 動態牆（發文、編輯、刪除、留言、圖片上傳） `[P0]`
- [ ] `/subscription` — 訂閱管理（目前方案、升級、取消、帳單記錄） `[P0]`
- [ ] `/settings` — 設定主頁（各區塊展開、儲存） `[P0]`
- [ ] `/smart-lists` — 智慧清單（新增、編輯條件、刪除、套用） `[P1]`
- [ ] `/smart-lists/:id` — 智慧清單詳情 `[P1]`
- [ ] `/pipeline` — Pipeline 看板（拖曳卡片、新增階段、編輯、刪除） `[P1]`
- [ ] `/automation` — 自動化規則（新增、編輯、啟用/停用、刪除） `[P1]`
- [ ] `/birthday` — 生日行事曆（月/週切換、聯絡人生日顯示） `[P1]`
- [ ] `/insights` — AI Insights（週報、各指標卡片、WeeklyReportView） `[P1]`
- [ ] `/interactions` — 互動記錄列表（篩選、排序、分頁） `[P1]`
- [ ] `/interactions/new` — 新增互動（類型切換、表單、儲存） `[P1]`
- [ ] `/communications` — 通訊中心（DialerView、CallLogView、各 tab） `[P1]`
- [ ] `/timeline` — 時間軸（捲動載入、篩選類型） `[P1]`
- [ ] `/posts` — 貼文管理（新增、編輯、刪除、排程） `[P1]`
- [ ] `/rewards` — 獎勵頁（點數、成就、兌換流程） `[P1]`
- [ ] `/referral` — 推薦中心（複製連結、分享、記錄查看） `[P1]`
- [ ] `/events` — 活動列表（新增、編輯、刪除、篩選） `[P1]`
- [ ] `/events/:eventId` — 活動詳情（報名、參與者管理） `[P1]`
- [ ] `/photos` — 相片管理（上傳、刪除、相簿切換） `[P1]`
- [ ] `/business-card-scan` — 名片掃描（上傳圖片、AI 解析結果、確認匯入） `[P1]`
- [ ] `/team` — 團隊管理（邀請成員、角色設定、移除成員） `[P1]`
- [ ] `/settings/tags` — 標籤管理（新增、編輯顏色、刪除、套用至聯絡人） `[P1]`
- [ ] `/settings/promo-code` — 優惠碼（輸入有效、無效、已使用） `[P1]`
- [ ] `/settings/plugins` — Plugin 設定（啟用、停用、設定） `[P1]`
- [ ] `/import` — 匯入聯絡人（CSV 上傳、欄位對應、確認匯入、衝突處理） `[P1]`
- [ ] `/support` — 客服支援（送出回饋、FAQ 展開） `[P1]`
- [ ] `/wishpool` — 功能許願池（新增許願、投票） `[P1]`
- [ ] `/cozy` — Cozy 生態系（整合項目、連結/斷開） `[P1]`

### CRUD 元件通用測試（每個功能都要覆蓋）
- 新增：正常流程、必填欄位空白、超長文字、特殊字元
- 讀取：空列表 empty state、分頁 / 無限捲動、搜尋關鍵字
- 更新：修改後儲存、部分更新、取消還原
- 刪除：確認 dialog、刪除後列表即時更新

## API 交互測試

- **網路異常**
  - 離線模擬（Chrome DevTools → Network 面板 → Offline）：操作後顯示 NetworkStatusBanner，恢復連線後自動重試
  - 慢速連線模擬（Chrome DevTools → Network → Slow 3G）：Suspense loading fallback 正確顯示，不重複送出請求

- **HTTP 錯誤碼回應**
  - `400` — 顯示欄位層級錯誤（server validation error 對應欄位高亮）
  - `401` — 自動 token refresh；失敗則導回 `/login`，不丟失路由
  - `403` — 無權限提示，不 crash
  - `404` — 資源不存在時顯示 empty state 或錯誤訊息
  - `422` — 顯示 server 回傳的欄位驗證錯誤
  - `429` — rate limit 提示，不讓使用者無限重試
  - `500 / 503` — ErrorBoundary 正確接住，顯示錯誤頁，可重試

- **Token 生命週期**
  - Access token 過期 → 自動 refresh，操作不中斷
  - Refresh token 過期 → 導回 `/login`，query string 保留原始路由
  - 多 tab 登出 → 其他 tab 偵測到 session 失效並導向登入

- **並發與資料一致性**
  - 快速連點送出同一表單 → 只送出一次（按鈕 disabled 防重複）
  - 操作中途重新整理頁面 → 資料不丟失（localStorage / 快取）
  - **跨 Tab 競態**：同帳號開兩個瀏覽器 tab，同時編輯同一聯絡人 → 確認衝突解決行為（last-write-wins 或提示衝突），不靜默覆蓋

## RBAC / 權限邊界測試（Team 帳號）

CRM 有 Team 功能，必須測試不同角色的權限邊界：

- **Owner vs Member**
  - Owner 可邀請成員、刪除團隊成員 → 確認 Member 無此 UI 入口
  - 即使 Member 直接訪問 `/team` 管理頁 → 確認後端 API 拒絕（403），不僅前端隱藏
- **未授權操作**
  - 嘗試修改其他 Team 成員創建的私有資源 → API 應拒絕
  - 直接訪問無權限路由 → 正確顯示 403/empty state，不 crash

## Web 特有測試

- **Route Guards**
  - 未登入直接訪問 protected route → 導向 `/login`
  - 已登入訪問 `/login` / `/register` → GuestGuard 導向 `/dashboard`

- **Lazy Loading**
  - 首次訪問各 route → Suspense fallback PageLoader 正確顯示後消失
  - 網路慢時 lazy chunk 載入中不 crash

- **瀏覽器行為**
  - 上一頁 / 下一頁（BrowserRouter history）導航正確
  - 直接輸入 URL 訪問各路由 → 正確渲染（非 404）
  - 重新整理頁面 → 保持登入狀態，路由正確

- **Console 監控**（每頁必查）
  - 無未處理的 JS error
  - 無 React key warning、prop-types warning
  - 無 404 資源請求失敗

- **響應式佈局**
  - **320px**（small mobile）：最小支援寬度，所有元素不溢出、不重疊，文字可讀
  - **480px**（large mobile）：卡片單欄排列，導覽列折疊為 hamburger menu
  - **768px**（tablet）：側欄折疊，主要功能可用，表格可橫向捲動或切換為卡片式
  - **1024px**（desktop）：側欄展開，完整佈局，所有元件完整顯示
  - 表格、卡片、form 在各寬度不截斷
  - 使用 `mcp__claude-in-chrome__resize_window` 切換各 breakpoint 測試

## Keyboard 導航 & 無障礙

- **Tab 順序**：登入表單 → 主導覽列 → 頁面主要互動元件，順序符合視覺排列
- **Enter / Space**：button、checkbox、toggle 均可鍵盤觸發
- **Esc**：所有 modal / drawer 均可 Esc 關閉
- **跳過連結**（Skip to content）：若有，確認 `Tab` 第一個落點可用

## 反向測試情境
- 網路離線時操作各功能（NetworkStatusBanner 出現）
- 輸入特殊字元（emoji、`< > & " '`、SQL injection 字串、極長字串）
- 快速連點送出按鈕（防重複送出）
- 直接修改 URL 參數（`:id` 填不存在的 ID）
- 瀏覽器 localStorage 清空後操作（強制重新登入）
- 在表單填到一半直接離開頁面（未儲存提示）

## Agent Teams 執行架構

CRM Web 測試使用 **multi-agent team** 並行執行，避免單一 context 超限。

### Team 結構

| 角色 | 職責 |
|------|------|
| **Team Lead**（你） | 協調啟動、測試資料重置、Smoke Test、RBAC 邊界、反向測試、Route Guard / Lazy Loading、issue 彙整、收尾 CI/CD |
| **Sub-Agent x 5** | 各負責指定頁面，並行執行葉節點窮舉 |

### 頁面分配（每 Agent 最多 8 頁）

| Agent | 負責頁面 |
|-------|---------|
| `agent-auth` | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/auth/callback`, `/wishpool`, `/cozy` |
| `agent-core1` | `/dashboard`, `/contacts`, `/contacts/new`, `/contacts/:id`, `/contacts/:id/edit`, `/smart-lists`, `/smart-lists/:id`, `/pipeline` |
| `agent-core2` | `/automation`, `/birthday`, `/insights`, `/feed`, `/interactions`, `/interactions/new`, `/communications`, `/timeline` |
| `agent-core3` | `/posts`, `/reminders`, `/rewards`, `/referral`, `/subscription`, `/events`, `/events/:eventId`, `/photos` |
| `agent-settings` | `/business-card-scan`, `/team`, `/settings`, `/settings/tags`, `/settings/promo-code`, `/settings/plugins`, `/import`, `/support` |

### Sub-Agent 指令範本

啟動每個 sub-agent 時傳遞以下資訊：

```
你是 CRM Web QA sub-agent（{agent 名稱}），負責測試以下頁面：
{頁面列表}

測試環境：https://dev.ctrs.app
帳號：$CONNECTORS_QA_EMAIL / $CONNECTORS_QA_PASSWORD
測試資料已就緒（Team Lead 已確認）

要求：
- 依 Iron Rule 對每頁做葉節點窮舉
- 每頁測試後 read_console_messages 確認無 JS error
- Console error 分級：Error=P1 建 issue | Warning=P3 建 issue | Deprecation=log only
- 響應式測試：每頁至少測 320px、768px、1024px 三個 breakpoint
- 發現 issue → 立即以 sub-agent 建立 GitHub issue
  標題格式：[CRM Web QA] {路由} - {問題摘要}（{P0/P1/P2/P3}）
  嚴重度分級：P0 白屏/遺失資料 | P1 功能壞掉有JS error | P2 部分異常 | P3 UI瑕疵
- 每頁完成後回報：✅/❌ 頁面路由 | issue #（若有）| console error 數
- Context 達 70% → /compact 後繼續
```

### 執行順序

1. Team Lead 完成測試資料重置（升級訂閱 → 新增聯絡人）
2. **訂閱升級依賴檢查 — 確認訂閱升級成功後才可繼續**（見「訂閱升級依賴檢查」段落）
3. Team Lead 執行 Smoke Test（確認核心路徑可用）
4. **同時啟動 5 個 sub-agent（並行）**
5. Team Lead 同步執行 RBAC 邊界、反向測試情境、Route Guard、Lazy Loading 測試
6. 收集各 agent 回報，彙整 issue 清單
7. 所有 agent 完成後進入收尾流程

## Issue 管理流程

發現任何問題，**無論是否可立即修復**，都要先以 sub-agent 建立 GitHub issue：

```
標題：[CRM Web QA] {頁面路由} - {問題摘要}（{P0/P1/P2/P3}）
內容：
- 嚴重度：{P0 Blocker / P1 Critical / P2 Major / P3 Minor}
- 問題描述
- 測試情境（正向/反向）
- 重現步驟（含測試帳號、完整 URL）
- 預期行為 vs 實際行為
- Console error 截圖或 log 片段
- 測試環境：https://dev.ctrs.app
```

- 可修復 → 修復後關閉 issue
- 不適合當下修復 → 加 `pending` tag，保留 open，繼續測試

## Context 壓縮機制

**當 context 使用量達 70% 時，立即執行：**

```
/compact
```

壓縮前先將當前測試進度（已完成頁面 / 待測清單）儲存至記憶，壓縮後從斷點繼續。

## 任務完成條件與收尾流程

### Step 1 — 測試後資料清理
```
前往 /contacts → 刪除所有測試期間建立的聯絡人（名稱含 "Test"、"QA"、"tmp"）
前往 /reminders → 刪除測試用提醒
前往 /posts → 刪除測試用貼文
```

### Step 2 — 本機 Build 驗證
```bash
pnpm nx build crm-web
```
- 無 TypeScript error
- Console 全程無未處理 JS error（每頁查核記錄）
- 所有 P0 Blocker / P1 Critical issue 已修復並關閉
- P2/P3 issue 已加 `pending` tag

### Step 3 — Commit & Push to dev
Build 成功後，提交所有修改並推送至 `dev` branch：
```bash
# 只 stage 實際修改的檔案，不用 git add -A
git add apps/crm-web/src/...   # 列出具體路徑
git commit -m "fix(crm-web): QA real-test fixes - [簡短描述修復內容]"
git push origin dev
```

### Step 4 — 監控 CI/CD 直到佈署完成
推送後，持續監控 CI/CD pipeline：
- 使用 `gh run list --branch dev --limit 5` 查看最新 run 狀態
- 使用 `gh run watch <run-id>` 即時追蹤執行進度
- 若 CI 有錯誤 → 分析 log → 修復 → 再次 commit + push
- 持續循環直到 CI 全綠、https://dev.ctrs.app 佈署成功為止

**任務未完成不得停止，持續監持 CI/CD 直到佈署完成為止。**

## 錯誤恢復

測試過程中遇到非預期錯誤時，依以下策略恢復：

### 瀏覽器層級錯誤
| 狀況 | 恢復動作 |
|------|---------|
| Tab crash / 無回應 | 關閉該 tab → `tabs_create_mcp` 開新 tab → `navigate` 回到測試頁面 → 從該頁重新測試 |
| 白屏（非 app bug） | 重新整理頁面 → 若仍白屏，檢查 console → 若為網路問題等待 5 秒重試 |
| Chrome extension 衝突 | 記錄 extension 名稱 → 在無 extension 的 incognito 模式重測確認 |

### 認證錯誤
| 狀況 | 恢復動作 |
|------|---------|
| Session 過期（401） | 重新登入 → 從中斷頁面繼續測試 |
| 帳號被鎖定 | 等待 5 分鐘 → 重試 → 若仍鎖定，通知用戶 |
| 登入後導向錯誤頁面 | 手動 navigate 至目標路由 → 記錄為 P2 issue |

### 測試資料異常
| 狀況 | 恢復動作 |
|------|---------|
| 測試聯絡人被意外刪除 | 重新執行「新增測試聯絡人集」步驟 → 通知 sub-agent 資料已重置 |
| 資料庫狀態不一致 | 執行完整「測試資料重置」流程 → 從 Smoke Test 重新開始 |
| 訂閱狀態異常 | 檢查 /subscription 頁面 → 記錄狀態 → 通知用戶手動確認 |

### Sub-Agent 錯誤
| 狀況 | 恢復動作 |
|------|---------|
| Sub-agent context 用盡 | 記錄該 agent 已完成/未完成頁面 → 啟動新 sub-agent 接手未完成頁面 |
| Sub-agent 長時間無回應 | 等待 3 分鐘 → 若仍無回應，將其未完成頁面重新分配 |
| 多個 sub-agent 同時失敗 | 暫停所有 agent → 檢查測試環境是否正常 → 排除環境問題後重啟 |

### CI/CD 錯誤
| 狀況 | 恢復動作 |
|------|---------|
| Build 失敗（TypeScript error） | 讀取 error log → 修復 → 重新 commit + push |
| Deploy 失敗（infra 問題） | 檢查 `gh run view` log → 若為 infra 問題（OOM、timeout），通知用戶 → 手動觸發重跑 `gh workflow run` |
| CI workflow 未觸發 | 確認 push 成功 → 手動觸發：`gh workflow run deploy-web-staging.yml --ref dev` |
