---
name: git-check-pr
description: Review open PRs and decide whether to merge or close them based on whether changes are already in the target branch. Handles closing superseded PRs, detecting refactored code, merge safety checks, conflict resolution, and deleting stale branches. Use when user says "檢查 PR", "review PRs", "check PRs", "清理 PR", "audit PRs", "merge PR", "close stale PRs", "PR 狀態", or wants to audit open pull requests for staleness/redundancy.
---

# Git Check PR

審查所有 open PR，判斷修改是否有幫助且尚未在目標分支，決定 merge 或 close。

## Step 1: 列出所有 open PR

```bash
gh pr list --state open --json number,title,headRefName,baseRefName,author,createdAt
```

## Step 2: 取得每個 PR 詳細資訊（平行執行）

```bash
gh pr view <NUMBER> --json title,body,files,commits,headRefName
```

快速篩選規則：
- `files` 為空陣列 → 無程式碼，直接 Close
- bot 產生（Jules、Copilot）且只是報告 → 直接 Close
- CI workflow 有 `push` 自動觸發器 → 評估副作用後再決定

## Step 3: 驗證修改是否已在 target branch

**最可靠方法：直接 grep 檔案內容**

從 PR diff 挑出幾個具代表性的唯一字串，在 target branch 的實際檔案中驗證：

```bash
# 取得 PR diff（只需看前 200 行找代表字串）
gh pr diff <NUMBER> --patch 2>/dev/null | head -200

# 在 target branch（通常是 dev）的實際檔案中驗證
grep -n "<unique_string_from_pr>" <path/to/file>
```

**輔助方法：git diff 確認增量**

```bash
# fetch PR branch
git fetch origin <PR_BRANCH_NAME>

# 三點 diff：PR branch 從共同祖先新增了什麼
git diff origin/dev...origin/<PR_BRANCH> --stat

# 兩點 diff：dev 和 PR branch 之間的實際差距
# 如果 dev 方向顯示 "deletions" → 代表 dev 已包含 PR 的修改
git diff origin/<PR_BRANCH> origin/dev --stat
```

> **陷阱**：三點 diff 無法單獨判斷 dev 是否已包含修改（因歷史可能已分歧）。必須用 grep 最終確認。

### Refactored Code 偵測

PR 的修改可能已被 target branch 以不同形式（重構、重命名、拆分檔案）吸收。單純 grep 原始字串會漏判。需額外檢查：

**偵測步驟：**

1. **功能等價檢查**：PR 新增的功能（function、class、endpoint）是否已在 target branch 以不同命名/結構存在
   ```bash
   # PR 新增了 function calculateTotal() → 在 target branch 搜尋相同邏輯
   # 搜尋函式名稱
   grep -rn "calculateTotal\|computeTotal\|getTotal" <target-files>
   # 搜尋核心邏輯片段（如特定演算法、API call、DB query）
   grep -rn "<core_logic_snippet>" <target-files>
   ```

2. **檔案移動/重命名偵測**：
   ```bash
   # 檢查 PR 修改的檔案是否在 target branch 已被移動
   git log origin/dev --diff-filter=R --find-renames --name-status -- <pr-file-path>
   ```

3. **Import / Export 追蹤**：PR 新增的 export 是否已在 target branch 以不同路徑提供
   ```bash
   grep -rn "export.*<function_or_class_name>" apps/ libs/
   ```

**判斷結果：**
| 情況 | 判定 |
|------|------|
| 功能完全相同，只是命名/位置不同 | 視為「已吸收」→ Close |
| 功能部分重疊，PR 有額外邏輯 | 需人工審查 → 標記 `needs-review` |
| 找不到等價實作 | 視為「未吸收」→ 繼續評估 Merge |

## Step 4: 決策矩陣

| 情況 | 決策 |
|------|------|
| PR 所有修改都已在 target branch | **Close** — 已被吸收 |
| PR 修改已被重構吸收（功能等價） | **Close** — 已被重構吸收 |
| PR 有新的有用修改 | **Merge** 或留給人工審查 |
| `files` 為空（bot 報告類） | **Close** — 無程式碼 |
| CI workflow 有危險 push 觸發器 | **Close** — 風險大於收益 |

## Step 5: Merge Safety 檢查

在決定 Merge 之前，必須通過以下安全矩陣：

### Merge Safety 矩陣

| 檢查項目 | 指令 | 通過條件 | 失敗處理 |
|---------|------|---------|---------|
| **CI 狀態** | `gh pr checks <NUMBER>` | 所有 required checks 綠色 | 等待 CI 完成或修復失敗的 check |
| **衝突狀態** | `gh pr view <NUMBER> --json mergeable` | `mergeable: "MERGEABLE"` | 進入衝突處理流程（見下方） |
| **Review 狀態** | `gh pr view <NUMBER> --json reviewDecision` | `APPROVED` 或無 required review | 標記 `needs-review`，不自動 merge |
| **Branch 新鮮度** | `git log origin/dev..origin/<PR_BRANCH> --oneline` | 落後 dev 不超過 50 commits | 先 rebase/update branch 再 merge |
| **檔案衝突風險** | `gh pr view <NUMBER> --json files` 交叉比對近期 dev commits | 無高風險檔案（如 schema.prisma、package.json）同時被修改 | 人工審查後再 merge |

```bash
# 一次取得多項檢查資訊
gh pr view <NUMBER> --json mergeable,reviewDecision,statusCheckRollup,headRefName

# 檢查 branch 落後程度
git fetch origin
git rev-list --count origin/dev..origin/<PR_BRANCH>
git rev-list --count origin/<PR_BRANCH>..origin/dev
```

### Auto-Merge 條件（全部通過才可自動 merge）

- CI 全綠
- `mergeable: "MERGEABLE"`（無衝突）
- 無 required review 或已 APPROVED
- 落後 dev 不超過 50 commits
- 不涉及高風險檔案（schema.prisma、*.lock、CI config）

若任一條件未通過 → 標記原因，留給人工決策。

## Step 6: 衝突處理流程

當 PR `mergeable` 狀態為 `CONFLICTING` 時：

### 衝突評估

```bash
# 查看衝突檔案
gh pr view <NUMBER> --json files --jq '.files[].path'

# 嘗試本地 merge 預覽衝突範圍
git fetch origin <PR_BRANCH>
git merge-tree $(git merge-base origin/dev origin/<PR_BRANCH>) origin/dev origin/<PR_BRANCH>
```

### 衝突處理策略

| 衝突類型 | 策略 |
|---------|------|
| **Lock 檔案衝突**（pnpm-lock.yaml、Podfile.lock） | 接受 target branch 版本 → `git checkout origin/dev -- pnpm-lock.yaml` → 重新 `pnpm install` |
| **Schema 衝突**（schema.prisma） | 不自動解決 → 標記 `needs-review`，通知用戶 |
| **自動產生檔案**（i18n JSON、pbxproj） | 接受 target branch → 重新執行產生指令 |
| **程式碼邏輯衝突** | 讀取雙方修改意圖 → 若可合併則解決 → 若語義矛盾則標記 `needs-review` |
| **刪除 vs 修改衝突** | 確認 target branch 是否已移除該功能 → 若已移除則接受刪除 |

### 衝突解決執行

```bash
# 在本地建立臨時 branch 解決衝突
git checkout -b fix/resolve-pr-<NUMBER> origin/<PR_BRANCH>
git merge origin/dev

# 解決衝突後
git add <resolved-files>
git commit -m "chore: resolve merge conflicts with dev"
git push origin fix/resolve-pr-<NUMBER>

# 更新 PR 的 head branch（或建立新 PR）
gh pr edit <NUMBER> --head fix/resolve-pr-<NUMBER>
```

> **原則**：衝突解決後必須重新跑 CI，確認 build 通過才可 merge。

## Step 7: 執行關閉並刪除 branch

```bash
# 先關閉 PR（附說明）
gh pr close <NUMBER> --comment "<原因，說明為何關閉>"

# 再刪除 remote branch
gh api -X DELETE repos/<owner>/<repo>/git/refs/heads/<branch-name>
```

> 順序重要：先關 PR，再刪 branch。

## 輸出格式

用表格呈現每個 PR 的判斷結果：

```
| PR  | 標題 | 決策 | 原因 | Safety Check |
|-----|------|------|------|-------------|
| #XX | ...  | ✅ Close | 修改已在 dev (via commit ab99115e) | N/A |
| #YY | ...  | ✅ Close | 功能已被重構吸收（renamed to newFunc） | N/A |
| #ZZ | ...  | 🔀 Merge | 新功能尚未合入 | CI ✅ Conflict ✅ Review ✅ |
| #WW | ...  | ⚠️ Needs Review | 有衝突待解決 | CI ✅ Conflict ❌ |
```
