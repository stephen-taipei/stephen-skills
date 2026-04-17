---
name: git-check-issues
description: 使用 agent teams 並行審查並修復所有 open GitHub issues，略過帶有 "pending" 標籤的 issues。Use when the user says "/git-check-issues", "檢查 issues", "修復 issues", "check and fix issues", "fix open issues", "處理 GitHub issues", "批次修 issue", or wants to batch-process GitHub issues with parallel agents. Each agent reads an issue, finds the relevant code, implements the fix, commits it, and closes/comments the issue.
---

# Git Check Issues

用 agent teams 並行審查並修復所有 open issues，略過 `pending` 標籤的 issues。

## Step 1: 列出並過濾 Issues

```bash
# 取得所有 open issues（排除 pending）
gh issue list --state open --json number,title,labels,body --limit 100 \
  | python3 -c "
import json, sys
issues = json.load(sys.stdin)
filtered = [i for i in issues if not any(l['name'] == 'pending' for l in i['labels'])]
# 按優先級排序：P0/critical > P1/high > P2/medium > P3-low/low
def priority(i):
    labels = {l['name'] for l in i['labels']}
    if 'P0' in labels or 'priority: critical' in labels: return 0
    if 'P1' in labels or 'priority: high' in labels: return 1
    if 'P2' in labels or 'priority: medium' in labels: return 2
    return 3
filtered.sort(key=priority)
for i in filtered:
    lbls = ', '.join(l['name'] for l in i['labels'])
    print(f'#{i[\"number\"]} [{lbls}] {i[\"title\"]}')
print(f'Total: {len(filtered)} issues to process')
"
```

## Step 2: 建立 Agent Team

依 issues 數量決定 team 規模（每批最多 7 個 agent）：

```
TeamCreate: "issue-fixers"
```

然後按優先級分波（Wave 1: P0/P1 → Wave 2: P2 → Wave 3: P3-low）。每波最多同時 7 個 agent。

## Step 3: 每個 Agent 的任務模板

為每個 issue 派發一個 `general-purpose` agent，prompt 如下：

```
你是一位資深工程師，負責修復 GitHub issue #{NUMBER}。

任務步驟：
1. 讀取 issue 完整內容：
   gh issue view {NUMBER} --json title,body,labels,comments

2. 分析問題，找到相關程式碼（用 Grep/Glob/Read 工具）

3. 評估可修復性：
   - 可修復（有明確程式碼路徑）→ 實作修復
   - 需要外部整合（third-party API/service）→ 標記為 pending，留言說明
   - 設計層級問題（需討論）→ 留言分析，不強行修復

4. 如果可修復：
   a. 修改相關檔案（遵循 CLAUDE.md 規範）
   b. 執行 git commit（branch: dev）
      commit 訊息格式：fix(scope): <描述> (closes #{NUMBER})
   c. 關閉 issue：
      gh issue close {NUMBER} --comment "已修復：<簡述修復內容>\nCommit: <commit hash>"

5. 如果無法修復：
   gh issue comment {NUMBER} --body "⚠️ 此 issue 需要 <原因>，已標記 pending。"
   gh issue edit {NUMBER} --add-label "pending"

6. 回報結果給 team lead（SendMessage）：
   - issue 編號和標題
   - 結果：fixed / pending / skipped
   - commit hash（若已修復）
```

## Step 4: Issue 分類與分配

### Issue 分類原則（Issue Classifier）

在派發前，Team Lead 先掃描每個 issue 的標題、body、labels，按以下規則分類：

| 類型 | 可修復 | 說明 | 範例 |
|------|--------|------|------|
| `bug` + 有明確 file:line | ✅ 可修復 | 直接改程式碼 | "ContactsView.swift:45 crash on nil unwrap" |
| `enhancement` 邏輯層 | ✅ 可修復 | 在現有架構內添加功能 | "新增 /users 頁面的 CSV 匯出按鈕" |
| `enhancement` 需外部 API | ⚠️ pending | 需要 credentials/secrets | "整合 Google Maps Geocoding API" |
| `security` 程式碼漏洞 | ✅ 可修復 | 修補 code，非架構問題 | "XSS in user profile name field" |
| `i18n` / `translation-needed` | ✅ 可修復 | 加翻譯 key | "缺少 ja 語系的 reminder_title" |
| iOS build 相關 | ✅ 可修復（需驗 build） | 改完必須執行 `xcodebuild` | "iOS build fail: missing import" |
| Android build 相關 | ✅ 可修復（需驗 build） | 改完必須執行 Gradle build | "Kotlin compile error in ContactsActivity" |
| `documentation` | ✅ 可修復 | 更新文件 | "README 的 API 範例過時" |
| 架構/設計討論 | ⚠️ 留言分析 | 不強行修復 | "考慮從 REST 遷移到 GraphQL" |
| 需要用戶回饋/重現步驟 | ⚠️ 留言詢問 | 資訊不足無法修復 | "App 有時候會 crash"（無 stack trace） |

### 分類判斷流程

```
對每個 issue 執行：
1. 標題/body 是否包含明確檔案路徑或錯誤訊息？ → 可修復
2. 是否需要外部 API key / secret / 第三方服務？ → pending
3. 是否涉及架構變更或需要團隊討論？ → 留言分析
4. 是否資訊不足（無法重現、無 stack trace）？ → 留言詢問更多資訊
5. 其他 → 嘗試修復，修復失敗則標記 pending
```

### 分配策略

```
TaskCreate per issue → 分配給對應 agent
```

## Step 5: 等待 Wave 完成，收集結果

等所有 agent 回報後，整理最終摘要：

```
| Issue | 標題 | 結果 | Commit |
|-------|------|------|--------|
| #702  | CSRF Protection | ✅ fixed | abc1234 |
| #630  | Google Maps API | ⚠️ pending | — |
```

推送所有修復：

```bash
git push origin dev
```

## 衝突預防策略

多個 agent 同時修改同一檔案是最常見的失敗原因。必須在派發前主動預防：

### 派發前檔案分析

```
對每個 issue 執行：
1. 讀取 issue body，提取提及的檔案路徑（grep file:line 格式）
2. 用 Grep/Glob 搜尋可能涉及的模組
3. 建立 issue → 預估修改檔案 的對應表
```

### 波次編排規則

| 規則 | 說明 |
|------|------|
| **同檔案不同波** | 預估修改同一檔案的 issues 必須分到不同波次 |
| **同模組謹慎排** | 修改同一目錄（如 `apps/api/src/auth/`）的 issues 盡量分開 |
| **iOS pbxproj 獨佔** | 任何涉及 `project.pbxproj` 修改的 issue 必須獨立一個波次，不與其他 iOS issue 並行 |
| **Prisma schema 獨佔** | 涉及 `schema.prisma` 的 issue 不可並行 |
| **i18n 批次合併** | 多個翻譯 issue 可並行（各改不同語系檔案），但同一語系檔案的 issue 不可並行 |

### 衝突發生時的處理

```
若 agent commit 時遭遇 conflict：
1. git pull origin dev --rebase
2. 解決衝突後重新 commit
3. 若無法自動解決 → 回報 Team Lead，由 Team Lead 手動合併
```

## Build 驗證步驟

所有修復完成後，Team Lead 必須執行以下驗證，確認修復未引入新問題：

### 必要驗證（每次都做）

```bash
# 1. TypeScript 編譯檢查（API）
pnpm nx build api

# 2. Admin Web build
pnpm nx build admin-web

# 3. CRM Web build
pnpm nx build crm-web

# 4. Prisma client 生成（若有 schema 變更）
pnpm nx run api:prisma-generate
```

### 條件驗證（依修改範圍）

```bash
# 若有 iOS 修改 → 必須驗 Xcode build
cd ios-swift/Connectors && xcodebuild -scheme Connectors -destination 'platform=iOS Simulator,name=iPhone 17 Pro Max' build 2>&1 | tail -5

# 若有 Android 修改 → 必須驗 Gradle build
cd android && ./gradlew assembleDebug 2>&1 | tail -5

# 若有測試檔案修改 → 執行相關測試
pnpm nx test api --testPathPattern="<modified-test-pattern>"
```

### 驗證失敗處理

```
若 build 失敗：
1. 分析錯誤訊息，定位是哪個 commit 引入的問題
2. 通知該 agent 修復（或 Team Lead 直接修復）
3. 修復後重新執行完整 build 驗證
4. 所有 build 通過後才 git push
```

## 重要注意事項

- **永遠不要** `prisma db push`，schema 變更用 `prisma migrate dev`
- **iOS 修改必須** 驗 build 通過才算完成
- **每個 agent 只負責一個 issue**，不跨 issue 修改
- **commit 前先 `git pull origin dev`** 確保 base 是最新的
- **push 前必須通過 build 驗證**，不可帶著編譯錯誤推上 dev
