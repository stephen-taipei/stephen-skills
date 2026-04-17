---
name: admin-real-test
description: 使用 Claude-in-Chrome 瀏覽器自動化在 Admin Web (admin-web) 執行全功能 QA 測試。以資深 QA 測試主管角色，透過 Agent Teams 並行測試 150+ 頁面，P0/P1 分波執行，含 API 交互、RBAC 邊界、錯誤處理，管理 GitHub issue 生命週期直到 CI/CD 佈署完成。Use when user says "test admin", "qa admin", "admin-real-test", "測試 admin", "admin web QA".
---

# Admin Web 全功能 QA 測試

## 角色定位

你現在是 Web 最頂尖專業的資深 QA 測試主管。
必須以多種思維角度、針對各種可能情境，執行**正向測試**（happy path）與**反向測試**（edge case、錯誤輸入、邊界值、權限拒絕、網路異常等）。

## 測試環境

| 項目 | 值 |
|------|----|
| 測試網址 | 根據環境自動判斷（見下方說明）|
| 本機備用 | http://localhost:4201（需先執行 `pnpm nx serve admin-web`）|
| 主測試帳號（Super Admin） | 從本機 secret store 載入到 `CONNECTORS_ADMIN_EMAIL` |
| 密碼 | 從本機 secret store 載入到 `CONNECTORS_ADMIN_PASSWORD` |
| 工具 | `mcp__claude-in-chrome__*`（Chrome only） |

### 環境 URL 判斷規則

根據當前 git branch 或用戶指定，自動選擇測試目標 URL：

| 條件 | 測試 URL |
|------|----------|
| `dev` branch（預設） | `https://dev-admin.ctrs.app` |
| `staging` branch | `https://staging-admin.ctrs.app` |
| 用戶明確指定 URL | 使用用戶提供的 URL |
| 本機開發 | `http://localhost:4201` |

啟動時先執行 `git branch --show-current` 判斷當前分支，再決定目標 URL。若用戶在指令中附帶 URL，以用戶指定為準。

### 環境變數指引

測試帳號憑證**不得硬編碼在程式碼、issue 或測試報告中**。請依以下方式取得：

| 變數名稱 | 用途 | 來源 |
|----------|------|------|
| `CONNECTORS_ADMIN_EMAIL` | Super Admin 登入帳號 | 本機 secret store / `.env.local`（未追蹤） |
| `CONNECTORS_ADMIN_PASSWORD` | Super Admin 登入密碼 | 本機 secret store / `.env.local`（未追蹤） |
| `CONNECTORS_QA_EMAIL` | QA 測試用戶帳號 | 本機 secret store / `.env.local`（未追蹤） |

執行前請確認上述環境變數已載入。若變數不存在，提示用戶設定後再繼續，不要以空值或假值進行測試。

> **RBAC 測試注意**：完整 RBAC 測試需要第二個「Regular Admin」帳號（限制權限，無法存取 `/shield`、`/apex-classes` 等 super-admin 路由）。若環境中有此帳號，在 RBAC 邊界測試中使用。

## Bug 嚴重度分級

| 等級 | 定義 | 範例 | 處理方式 |
|------|------|------|----------|
| **P0 Blocker** | 頁面白屏 / 無法登入 / 資料遺失 / 安全漏洞 | 登入後白屏、API 無授權卻回 200 | 立即停止所有測試，修復後再繼續 |
| **P1 Critical** | 核心 Admin 功能壞掉，有 JS error | 使用者管理 CRUD 失敗、訂閱指派無效 | 當次 session 修復，建立 issue |
| **P2 Major** | 功能部分異常，有 workaround | 報表篩選不準、分頁計數錯誤 | 建立 issue，加 `pending`，繼續測試 |
| **P3 Minor** | UI 瑕疵、排版問題 | 表格欄寬跑版、tooltip 位置偏 | 建立 issue，加 `pending` |

## 測試資料重置（每次測試前必做）

**每次執行測試前必須從乾淨狀態開始，透過 Admin 面板操作，同時驗證 Admin 管理功能。**

### 重置步驟

```
1. 登入 Admin Web（依環境 URL 判斷規則），帳號：$CONNECTORS_ADMIN_EMAIL
2. 前往 /users → 搜尋 $CONNECTORS_QA_EMAIL
3. 在使用者詳情中確認：
   - 帳號狀態：active（非 disabled）
   - 訂閱狀態：若無有效訂閱 → 透過 admin 介面指派 TEAM 月訂閱
     （此步驟同時測試 admin 的訂閱管理功能）
4. 前往 /tags → 刪除所有名稱含「test」「qa」「tmp」的標籤
5. 前往 /promo-codes → 刪除所有過期或測試用優惠碼
6. 新增測試基礎資料（操作同時測試對應 admin 功能）：
   - 新增 1 筆有效優惠碼（有效期 1 天）→ 確認新增成功
   - 新增 1 個測試 Webhook endpoint → 確認新增、測試按鈕可用
   - 新增 1 組測試 API Key → 確認複製功能正常
7. 所有資料重置完成後，通知所有 sub-agent 開始測試
```

## 啟動流程

```
1. mcp__claude-in-chrome__tabs_context_mcp — 確認目前 tab 狀態
2. mcp__claude-in-chrome__tabs_create_mcp — 開新 tab
3. mcp__claude-in-chrome__navigate — 前往 {環境 URL}/login
4. 完成測試資料重置流程（見上方）

【Smoke Test — 60 秒快速驗證，確認核心路徑可用再展開全測】
（每步驟預期 ≤ 5 秒完成，頁面載入 ≤ 3 秒；若超時視為效能問題，記錄至報告）
5. 登入成功 → 確認 /dashboard 載入完成（無白屏、無 console error）
6. 前往 /users → 確認列表顯示，可搜尋 $CONNECTORS_QA_EMAIL
7. 前往 /subscriptions → 確認列表可載入
8. 前往 /audit-logs → 確認日誌可載入
9. 登出 → 確認跳回 /login

若 Smoke Test 任一步驟失敗（P0 Blocker）→ 先修復，再通知 sub-agent 啟動
10. 啟動 Agent Teams（P0 Wave 先行，見下方架構）
```

## 測試深度原則（Iron Rule）

**每個頁面測試必須做到「葉節點窮舉」：**

1. **進入每一個子路由** — 所有 `/path/:id`、detail、sub-tab 都要訪問
2. **觸發每一個 modal / dialog / drawer / toast** — confirm、error、success、empty state
3. **點擊每一個互動元件** — button、dropdown、checkbox、radio、toggle、tab、pagination、sort、filter、table row action
4. **填寫每一個表單欄位** — 正常值、空白、超長、特殊字元各測一次
5. **確認四種 UI 狀態** — loading、success、error、empty 都要出現並驗證
6. **每頁測試後必查 console** — `mcp__claude-in-chrome__read_console_messages` 確認無 JS error

**不符合以上標準的頁面不算測試完成，不得勾選 checklist。**

## 測試範圍與優先順序

> **P0**：業務關鍵，每次測試必須完成
> **P1**：重要功能，P0 完成後執行
> **P2**：Dev Tools / 低頻功能，一般 QA 跳過

### 認證 `[P0]`
- [ ] `/login` — 登入（正確、錯誤密碼、空白欄位）
- [ ] 未登入訪問 protected route → 導向 `/login`

### Dashboard / Analytics `[P0]`
- [ ] `/dashboard` — 儀表板（所有圖表、數據卡片、快捷操作）
- [ ] `/analytics` — 分析總覽
- [ ] `/reports` — 報表（新增、篩選、匯出）
- [ ] `/revenue-analytics` — 營收分析
- [ ] `/predictive-analytics` — 預測分析
- [ ] `/dashboard-builder` — 儀表板建構器
- [ ] `/einstein-analytics` — Einstein 分析
- [ ] `/analytics/smart-lists` — 智慧清單分析
- [ ] `/analytics/pipeline` — Pipeline 報表
- [ ] `/analytics/workflows` — 工作流監控 `[P1]`
- [ ] `/ab-testing` — A/B 測試儀表板 `[P1]`

### Users / Orgs `[P0]`
- [ ] `/users` — 使用者列表（搜尋、篩選、分頁）
- [ ] `/users/:userId` — 使用者詳情（所有 tab、編輯、停用）
- [ ] `/devices` — 裝置管理
- [ ] `/orgs` — 組織管理（新增、編輯、刪除）
- [ ] `/roles-permissions` — 角色與權限（新增角色、權限矩陣編輯）
- [ ] `/team` — 團隊管理（邀請、移除、角色設定）
- [ ] `/permission-sets` — 權限集
- [ ] `/profiles` — 設定檔管理 `[P1]`
- [ ] `/login-history` — 登入記錄 `[P1]`

### Subscriptions / Revenue `[P0]`
- [ ] `/subscriptions` — 訂閱管理（篩選、查看詳情、取消、退款）
- [ ] `/promo-codes` — 優惠碼（新增、啟用/停用、刪除）
- [ ] `/gift-ledger` — 禮物帳本
- [ ] `/waitlist` — 候補名單 `[P1]`
- [ ] `/subscription-renewal` — 訂閱續約 `[P1]`
- [ ] `/commission-tracking` — 佣金追蹤 `[P1]`
- [ ] `/price-book` — 價格書 `[P1]`
- [ ] `/referral-program` — 推薦計畫

### AI `[P0]`
- [ ] `/ai-hub` — AI 中心（所有 tab、設定）
- [ ] `/ai-settings` — AI 設定
- [ ] `/ai-cost` — AI 成本分析
- [ ] `/ai-recommendations` — AI 建議 `[P1]`
- [ ] `/einstein-gpt` — Einstein GPT `[P1]`

### System / Admin `[P0]`
- [ ] `/system` — 系統狀態（健康檢查、服務狀態）
- [ ] `/audit-logs` — 稽核日誌（篩選、匯出）
- [ ] `/content-moderation` — 內容審核（審核、核准、拒絕）
- [ ] `/shield` — Shield 安全設定
- [ ] `/setup-audit-trail` — Setup 稽核軌跡
- [ ] `/event-monitoring` — 事件監控
- [ ] `/settings` — 設定（各區塊展開儲存）
- [ ] `/settings/anniversary-types` — 週年紀念類型設定
- [ ] `/cozy` — Cozy 生態系整合 `[P1]`
- [ ] `/analytics/plugins` — Plugin 管理 `[P1]`
- [ ] `/analytics/ocr` — OCR 用量 `[P1]`

### Communications `[P0]`
- [ ] `/notifications` — 通知管理（新增、篩選、發送）
- [ ] `/email-templates` — Email 模板（新增、編輯、預覽、刪除）
- [ ] `/mass-email` — 大量 Email（建立活動、排程、發送）
- [ ] `/live-chat` — 即時客服（設定、對話列表）
- [ ] `/chatter` — Chatter（新增貼文、留言、刪除）
- [ ] `/email-deliverability` — Email 可交付性 `[P1]`
- [ ] `/email-tracking` — Email 追蹤 `[P1]`

### Integrations / API `[P0]`
- [ ] `/api-keys` — API 金鑰（新增、複製、刪除）
- [ ] `/integrations` — 整合管理（啟用、設定、停用）
- [ ] `/webhooks` — Webhook（新增、測試、刪除）
- [ ] `/connected-apps` — 已連接應用 `[P1]`
- [ ] `/external-services` — 外部服務 `[P1]`
- [ ] `/named-credentials` — 命名憑證 `[P1]`
- [ ] `/remote-site-settings` — 遠端站台設定 `[P1]`
- [ ] `/platform-events` — 平台事件 `[P1]`

### CRM / Contacts `[P1]`
- [ ] `/segments` — 客戶分群（新增條件、套用）
- [ ] `/tags` — 標籤管理（新增、編輯顏色、刪除）
- [ ] `/health-score` — 健康評分設定
- [ ] `/activity-feed` — 活動動態
- [ ] `/customer-360` — 客戶 360 視圖
- [ ] `/activity-timeline` — 活動時間軸
- [ ] `/duplicate-management` — 重複資料管理（合併）
- [ ] `/smart-follow-up` — 智慧跟進設定
- [ ] `/relationship-network` — 關係網路圖

### Sales `[P1]`
- [ ] `/sales-pipeline` — 銷售 Pipeline
- [ ] `/goals` — 目標設定（新增、編輯、追蹤進度）
- [ ] `/lead-scoring` — 潛在客戶評分
- [ ] `/sales-forecasting` — 銷售預測
- [ ] `/quote-builder` — 報價單建構
- [ ] `/cpq` — CPQ 設定
- [ ] `/territory-management` — 區域管理
- [ ] `/partner-portal` — 合作夥伴入口
- [ ] `/competitor-analysis` — 競爭對手分析

### Marketing `[P1]`
- [ ] `/marketing-automation` — 行銷自動化（新增規則、觸發條件）
- [ ] `/campaign-management` — 活動管理（新增、編輯、啟動、停止）
- [ ] `/social-listening` — 社群監聽
- [ ] `/landing-settings` — 落地頁設定

### Support / Service `[P1]`
- [ ] `/support-tickets` — 支援票單（篩選、指派、關閉）
- [ ] `/knowledge-base` — 知識庫（新增文章、分類、發布）
- [ ] `/surveys` — 問卷（新增、發送、查看結果）
- [ ] `/sla-management` — SLA 管理（新增規則、監控）
- [ ] `/case-management` — 案例管理
- [ ] `/field-service` — 外勤服務
- [ ] `/omni-channel` — 全通路設定

### Operations / Workflows `[P1]`
- [ ] `/workflows` — 工作流（新增、編輯、啟用/停用）
- [ ] `/tasks` — 任務管理
- [ ] `/bulk-operations` — 批量操作
- [ ] `/calendar` — 行事曆
- [ ] `/approval-workflows` — 審批工作流
- [ ] `/resource-calendar` — 資源行事曆
- [ ] `/scheduled-jobs` — 排程工作

### Data Management `[P1]`
- [ ] `/data-import-export` — 資料匯入匯出
- [ ] `/data-loader` — 資料載入器
- [ ] `/import-wizard` — 匯入精靈（CSV 上傳、欄位對應、確認）
- [ ] `/export-data` — 匯出資料（格式選擇、篩選、下載）
- [ ] `/data-cloud` — 資料雲
- [ ] `/schema-builder` — Schema 建構器
- [ ] `/object-manager` — 物件管理器

### Products / Inventory `[P1]`
- [ ] `/product-catalog` — 產品目錄（新增、編輯、刪除）
- [ ] `/inventory-management` — 庫存管理
- [ ] `/order-management` — 訂單管理
- [ ] `/asset-management` — 資產管理
- [ ] `/entitlement-management` — 授權管理
- [ ] `/work-order-management` — 工作訂單管理

### Content `[P1]`
- [ ] `/document-management` — 文件管理
- [ ] `/content-library` — 內容庫
- [ ] `/quote-templates` — 報價模板
- [ ] `/contracts` — 合約管理

### Gamification / Engagement `[P1]`
- [ ] `/gamification` — 遊戲化設定
- [ ] `/onboarding` — 入門引導設定
- [ ] `/customer-journey` — 客戶旅程
- [ ] `/community-portal` — 社群入口

### Comms / Telephony `[P1]`
- [ ] `/call-logs` — 通話記錄
- [ ] `/meeting-scheduler` — 會議排程
- [ ] `/voice-transcription` — 語音轉錄

### Dev / Setup Tools `[P2 — 一般 QA 跳過]`

> 以下頁面為開發者工具，非一般業務功能，除非專項測試否則略過。

- `/flow-builder`, `/sandbox-manager`, `/app-builder`, `/process-builder`
- `/apex-classes`, `/apex-triggers`, `/lightning-components`, `/validation-rules`
- `/custom-metadata-types`, `/workflow-rules`, `/async-apex`, `/debug-logs`
- `/deployment-status`, `/change-sets`, `/apex-test-execution`, `/static-resources`
- `/visualforce-pages`, `/custom-settings`, `/custom-labels`, `/quip`

## CRUD 元件通用測試
- 新增：正常流程、必填欄位空白、超長文字、特殊字元
- 讀取：空列表 empty state、分頁、搜尋、排序
- 更新：修改後儲存、取消還原
- 刪除：確認 dialog、刪除後列表即時更新

## Audit Log 驗證協議

**每個 P0 重要操作後，必須前往 `/audit-logs` 驗證日誌是否正確記錄：**

```
驗證清單（每個操作完成後執行）：
- 新增/編輯/刪除使用者 → 確認 audit log 有對應記錄（操作類型、操作者、時間）
- 訂閱指派/取消 → 確認有 subscription change 日誌
- 角色/權限變更 → 確認有 permission change 日誌
- API Key 新增/刪除 → 確認有 api_key 日誌

若操作後 audit log 沒有記錄 → P1 issue，標題：[Admin Web QA] /audit-logs - {操作名稱} 未產生日誌
```

## 批次操作壓力測試

```
測試情境（P1 功能，建議在 P1 Wave 中執行）：
1. 批量選取 100+ 筆使用者 → 執行批量停用 → 確認所有帳號狀態更新，無 timeout 或部分失敗
2. 批量刪除 50+ 筆 promo code → 確認全部刪除，列表正確更新
3. 大量 email 發送（mass-email 100+ 收件人）→ 確認發送進度正確顯示，不卡住
4. 若有進度指示器 → 確認百分比準確，完成後有成功通知
```

## 匯出資料驗證

```
測試情境：
1. 前往 /export-data 或含匯出功能的頁面
2. 選擇 CSV 格式匯出 10-50 筆資料
3. 下載後驗證：
   - 欄位標頭與 UI 顯示的欄位一致
   - 資料筆數正確（與畫面顯示相同）
   - 特殊字元未損毀（UTF-8 編碼正確）
   - 日期格式統一
4. 若有 Excel 格式 → 驗證同上

若匯出資料與 UI 顯示不一致 → P1 issue
```

## API 交互測試

- **網路異常**
  - 完全離線（Chrome DevTools → Network → Offline）：操作後顯示錯誤提示，恢復連線後可重試
  - 慢速連線（Chrome DevTools → Network → Slow 3G）：loading state 正確顯示，不重複觸發請求

- **HTTP 錯誤碼**
  - `400` — 欄位層級錯誤顯示（server validation 對應欄位高亮）
  - `401` — 自動 token refresh；失敗導回 `/login`，保留原始路由
  - `403` — 無權限提示，不 crash
  - `404` — empty state 或錯誤訊息
  - `422` — server validation 欄位對應
  - `429` — rate limit 提示，不讓使用者無限重試
  - `500/503` — ErrorBoundary 接住，顯示錯誤頁，可重試

- **Token 生命週期**
  - Access token 過期 → 自動 refresh，操作不中斷
  - Refresh token 過期 → 導回 `/login`，query string 保留原始路由
  - **多 tab 登出** → 其他 tab 偵測到 session 失效並自動導向登入

- **並發與資料一致性**
  - 快速連點送出同一表單 → 只送出一次（button disabled 防重複）
  - 操作中途重新整理頁面 → 資料不丟失

## Web 特有測試

- **Route Guard**：未登入訪問 protected route → 導向 `/login`
- **Lazy Loading**：首次訪問各 route，Suspense PageLoader 正確顯示後消失
- **Console 監控**（每頁必查）：無未處理 JS error、無 React key warning
- **響應式佈局**：Desktop 1440px 側欄展開、Tablet 768px 側欄折疊，各頁面不截斷

## Keyboard 導航 & 無障礙

- **Tab 順序**：登入表單 → 主導覽列 → 頁面主要互動元件，順序符合視覺排列
- **Enter / Space**：button、checkbox、toggle、table row action 均可鍵盤觸發
- **Esc**：所有 modal / drawer / confirm dialog 均可 Esc 關閉

## RBAC 邊界測試（Admin 特有，高優先）

這是 Admin 面板最關鍵的安全測試，由 **`p0-rbac-boundary` 專屬 agent** 負責執行：

- **前端隱藏 ≠ 後端保護**：即使 UI 隱藏了按鈕，仍需直接呼叫對應 API 確認後端確實拒絕
- **Super Admin vs Regular Admin**（若有第二個測試帳號）
  - Regular admin 嘗試存取 super-admin 限定路由（如 `/shield`、`/apex-classes`）→ 應回 403 或導向無權限頁
  - 直接 URL 輸入高權限路由 → 確認 Route Guard 正確攔截
- **跨資源存取**：嘗試修改/刪除屬於其他組織的資源 → 應被 API 拒絕（不僅 UI 層隱藏）
- **刪除後再存取**：刪除某筆資料後，嘗試直接訪問其 detail URL → 正確顯示 404/empty state，不 crash
- **Audit Log 驗證**：每個成功的 RBAC 攔截應有對應 audit log 記錄

## 反向測試情境
- 網路離線時操作各功能
- 輸入特殊字元（emoji、`< > & " '`、極長字串）
- 快速連點送出按鈕（防重複）
- 直接修改 URL 參數（填不存在的 ID）
- localStorage 清空後操作（強制重新登入）

## Agent Teams 執行架構

Admin Web 共 150+ P0/P1 頁面，分 **P0 Wave → P1 Wave** 兩階段並行，P2 略過。

### Team 結構

| 角色 | 職責 |
|------|------|
| **Team Lead**（你） | 協調、資料重置、Smoke Test、反向測試、issue 彙整、收尾 CI/CD |
| **`p0-rbac-boundary`** | 專責 RBAC 邊界、安全漏洞、audit log 驗證（P0 Wave 同步執行） |
| **Sub-Agent × 6（P0 頁面）** | 各負責最多 8 頁 P0 功能 |
| **Sub-Agent × 8（P1 頁面）** | P0 完成後啟動，各負責最多 8 頁 P1 功能 |

### P0 Wave（第一批，優先啟動）

| Agent | 負責頁面（最多 8 頁） |
|-------|---------------------|
| `p0-auth-users` | `/login`, `/users`, `/users/:userId`, `/devices`, `/orgs`, `/roles-permissions`, `/team`, `/permission-sets` |
| `p0-revenue` | `/subscriptions`, `/promo-codes`, `/gift-ledger`, `/referral-program`, `/waitlist`, `/subscription-renewal`, `/commission-tracking`, `/price-book` |
| `p0-ai-system` | `/ai-hub`, `/ai-settings`, `/ai-cost`, `/system`, `/audit-logs`, `/content-moderation`, `/shield`, `/setup-audit-trail` |
| `p0-comms` | `/notifications`, `/email-templates`, `/mass-email`, `/live-chat`, `/chatter`, `/email-deliverability`, `/email-tracking`, `/event-monitoring` |
| `p0-integrations` | `/api-keys`, `/integrations`, `/webhooks`, `/settings`, `/settings/anniversary-types`, `/analytics/plugins`, `/analytics/ocr`, `/cozy` |
| `p0-analytics` | `/dashboard`, `/analytics`, `/reports`, `/revenue-analytics`, `/predictive-analytics`, `/dashboard-builder`, `/analytics/smart-lists`, `/analytics/pipeline` |
| `p0-rbac-boundary` | **跨頁面 RBAC 安全測試**（不負責特定頁面，而是做：API 直呼授權驗證、URL 參數竄改、刪除後存取、跨組織資源存取、Audit Log 驗證） |

### P1 Wave（P0 全部完成後啟動）

| Agent | 負責頁面（最多 8 頁） |
|-------|---------------------|
| `p1-crm` | `/segments`, `/tags`, `/health-score`, `/activity-feed`, `/customer-360`, `/activity-timeline`, `/duplicate-management`, `/smart-follow-up` |
| `p1-sales` | `/sales-pipeline`, `/goals`, `/lead-scoring`, `/sales-forecasting`, `/quote-builder`, `/territory-management`, `/partner-portal`, `/competitor-analysis` |
| `p1-marketing` | `/marketing-automation`, `/campaign-management`, `/social-listening`, `/landing-settings`, `/ab-testing`, `/einstein-gpt`, `/einstein-analytics`, `/ai-recommendations` |
| `p1-support` | `/support-tickets`, `/knowledge-base`, `/surveys`, `/sla-management`, `/case-management`, `/field-service`, `/omni-channel`, `/analytics/workflows` |
| `p1-operations` | `/workflows`, `/tasks`, `/bulk-operations`, `/calendar`, `/approval-workflows`, `/resource-calendar`, `/scheduled-jobs`, `/login-history` |
| `p1-data` | `/data-import-export`, `/data-loader`, `/import-wizard`, `/export-data`, `/data-cloud`, `/schema-builder`, `/object-manager`, `/profiles` |
| `p1-products` | `/product-catalog`, `/inventory-management`, `/order-management`, `/asset-management`, `/entitlement-management`, `/work-order-management`, `/document-management`, `/content-library` |
| `p1-misc` | `/gamification`, `/onboarding`, `/customer-journey`, `/community-portal`, `/call-logs`, `/relationship-network`, `/connected-apps`, `/external-services` |

### Sub-Agent 指令範本

```
你是 Admin Web QA sub-agent（{agent 名稱}），負責測試以下頁面：
{頁面列表}

測試環境：{環境 URL}（依 git branch 自動判斷或由 Team Lead 指定）
帳號：$CONNECTORS_ADMIN_EMAIL / $CONNECTORS_ADMIN_PASSWORD
測試資料已就緒（Team Lead 已確認）

要求：
- 依 Iron Rule 對每頁做葉節點窮舉
- 每頁測試後 read_console_messages 確認無 JS error
- 重要操作後（新增/刪除使用者、權限變更）前往 /audit-logs 驗證日誌
- 發現 issue → 立即以 sub-agent 建立 GitHub issue
  標題格式：[Admin Web QA] {路由} - {問題摘要}（{P0/P1/P2/P3}）
  嚴重度：P0 白屏/安全漏洞 | P1 核心功能壞有JS error | P2 部分異常 | P3 UI瑕疵
- 每頁完成後回報：✅/❌ 頁面路由 | issue #（若有）| console error 數
- Context 達 70% → /compact 後繼續
```

### p0-rbac-boundary Agent 指令範本

```
你是 Admin Web RBAC 邊界測試 sub-agent。

你的任務是跨頁面安全邊界測試，不做 UI 功能測試，只做：

1. API 直呼授權驗證：
   - 直接 curl/fetch 呼叫需要 super-admin 權限的 API（如 /api/admin/shield、/api/admin/roles）
   - 用一般 admin 的 token（若有第二帳號）呼叫 → 確認回 403

2. URL 竄改測試：
   - 修改 /users/:userId 的 ID 為隨機值 → 確認回 404/空頁，不 crash
   - 直接訪問 /apex-classes、/flow-builder → 確認 Route Guard 攔截

3. 刪除後再存取：
   - 前往 /promo-codes → 刪除剛建立的測試優惠碼
   - 立即訪問其 detail URL → 確認 404/empty state，不 crash

4. Audit Log 驗證：
   - 以上每個操作後，前往 /audit-logs 確認是否有對應記錄

測試環境：{環境 URL}（依 git branch 自動判斷或由 Team Lead 指定）
帳號：$CONNECTORS_ADMIN_EMAIL / $CONNECTORS_ADMIN_PASSWORD

發現 issue → 立即以 sub-agent 建立 GitHub issue
標題格式：[Admin Web QA] RBAC - {問題摘要}（P0 安全漏洞）
```

### 執行順序

1. Team Lead 完成測試資料重置
2. Team Lead 執行 Smoke Test（確認核心路徑可用）
3. **同時啟動 P0 Wave 7 個 sub-agent（含 `p0-rbac-boundary`）**
4. Team Lead 同步執行反向測試情境
5. 等待 P0 全部完成，彙整回報
6. **同時啟動 P1 Wave 8 個 sub-agent**
7. 所有 agent 完成後進入收尾流程

## Issue 管理流程

發現問題立即以 sub-agent 建立 GitHub issue：

```
標題：[Admin Web QA] {頁面路由} - {問題摘要}（{P0/P1/P2/P3}）
內容：
- 嚴重度：{P0 Blocker / P1 Critical / P2 Major / P3 Minor}
- 問題描述 / 測試情境 / 重現步驟
- 預期行為 vs 實際行為
- Console error 或 log 片段
- 測試環境：{環境 URL}
```

- 可修復 → 修復後關閉 issue
- 不適合當下修復 → 加 `pending` tag，繼續測試

## Context 壓縮機制

**當 context 使用量達 70% 時，立即執行 `/compact`**

壓縮前儲存當前測試進度（已完成頁面 / 待測清單）至記憶，壓縮後從斷點繼續。

## 錯誤恢復

測試過程中可能遭遇各種異常，依以下策略恢復：

### 瀏覽器層級

| 狀況 | 恢復步驟 |
|------|----------|
| Tab crash / 無回應 | 關閉該 tab → `tabs_create_mcp` 開新 tab → `navigate` 回目標頁 → 從該頁重新測試 |
| Chrome 完全無回應 | 等待 10 秒 → 重新呼叫 `tabs_context_mcp` 確認連線 → 若仍失敗，通知用戶重啟 Chrome |
| 登入 session 過期 | `navigate` 至 `/login` → 重新登入 → 回到中斷頁面繼續 |

### 網路層級

| 狀況 | 恢復步驟 |
|------|----------|
| 頁面載入超時（> 10 秒） | 重試一次 → 仍超時則記錄為 P1 效能 issue → 跳過該頁繼續 |
| API 持續回 500/503 | 重試 2 次（間隔 3 秒）→ 仍失敗則記錄為 P0 issue → 通知 Team Lead |
| 環境完全不可達 | 確認 URL 正確 → 嘗試備用 URL → 通知用戶確認環境狀態 |

### Agent 層級

| 狀況 | 恢復步驟 |
|------|----------|
| Sub-agent 無回應 | 等待 2 分鐘 → 仍無回應則視為失敗 → Team Lead 接手該 agent 負責的頁面 |
| Sub-agent 回報 P0 Blocker | 所有 agent 暫停 → Team Lead 評估影響範圍 → 修復後重啟受影響的 agent |
| Context 壓縮後遺失進度 | 從記憶中讀取最後完成的頁面 → 從下一頁繼續（已完成頁面不重測） |

### 資料層級

| 狀況 | 恢復步驟 |
|------|----------|
| 測試資料被意外刪除 | 重新執行「測試資料重置」流程 → 通知所有 agent 等待 → 完成後繼續 |
| 測試帳號被停用/鎖定 | 使用備用帳號 → 或通知用戶解鎖 → 記錄為安全機制觸發（非 bug） |

**恢復原則**：任何單一頁面的失敗不應阻塞其他頁面的測試。記錄問題、跳過、繼續。只有 P0 Blocker（白屏/安全漏洞/資料遺失）才觸發全面暫停。

## 任務完成條件與收尾流程

### Step 1 — 本機 Build 驗證
```bash
pnpm nx build admin-web
```
- 無 TypeScript error
- Console 全程無未處理 JS error
- 所有 P0 Blocker / P1 Critical issue 已修復並關閉
- P2/P3 issue 已加 `pending` tag
- RBAC 邊界測試無安全漏洞（P0）
- Audit Log 驗證無缺漏

### Step 2 — Commit & Push to dev
```bash
# 只 stage 實際修改的檔案，不用 git add -A
git add apps/admin-web/src/...   # 列出具體路徑
git commit -m "fix(admin-web): QA real-test fixes - [簡短描述修復內容]"
git push origin dev
```

### Step 3 — 監控 CI/CD 直到佈署完成
```bash
gh run list --branch dev --limit 5
gh run watch <run-id>
```
- 若 CI 有錯誤 → 分析 log → 修復 → 再次 commit + push
- 持續循環直到 CI 全綠、Admin Web 佈署成功

**任務未完成不得停止，持續監持 CI/CD 直到佈署完成為止。**
