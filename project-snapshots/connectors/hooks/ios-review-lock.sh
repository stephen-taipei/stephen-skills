#!/usr/bin/env bash
# PreToolUse hook: 在 iOS TestFlight 送審期間擋下會改 API response shape
# 的 backend 檔案 edit。這是為了防止「送審後又動 response 欄位」造成已
# 送審 client 出現 DecodingError 的經典 API contract drift（#1634 案例）。
#
# 啟用方式：在 repo 根目錄建立 .claude/ios-review-lock 檔案
#   echo "Submission: 2026-04-14 19:00, build 1.0.0+42, commit 2075258ac" \
#     > .claude/ios-review-lock
# 解除：
#   rm .claude/ios-review-lock
#
# 擋哪些檔案：
#   apps/api/src/**/*.controller.ts
#   apps/api/src/**/*.service.ts
#   apps/api/src/**/dto/**/*.ts
#   apps/api/src/trpc/**/*.ts
# 豁免（跑測試、修 spec 不算改 response）：
#   *.spec.ts / *.test.ts

set -u

repo_root="${CLAUDE_PROJECT_DIR:-$PWD}"
lock="$repo_root/.claude/ios-review-lock"
[[ -f "$lock" ]] || exit 0

input=$(cat)
file=$(printf '%s' "$input" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null)
[[ -n "$file" ]] || exit 0

# 豁免：測試檔
case "$file" in
  *.spec.ts|*.test.ts|*.spec.tsx|*.test.tsx) exit 0 ;;
esac

# 命中：後端 response-shape 高風險區
case "$file" in
  *apps/api/src/*.controller.ts) ;;
  *apps/api/src/*.service.ts) ;;
  *apps/api/src/*/dto/*.ts) ;;
  *apps/api/src/trpc/*.ts) ;;
  *) exit 0 ;;
esac

lock_text=$(cat "$lock" 2>/dev/null)

read -r -d '' reason <<REASON || true
iOS TestFlight 送審中（.claude/ios-review-lock 存在）：
${lock_text}

要編輯的檔案屬於後端 API response shape 高風險區：
${file}

在送審期間修改 response 欄位名/型別/結構，已送審的 iOS binary decode
就會爆（#1634 / enrich sources 就是這樣踩的）。

判斷原則：
  ✓ 可以過：純內部 logic、快取、SQL 查詢、錯誤處理、註解、log
  ✓ 可以過：新增 optional response 欄位（舊 client 會忽略）
  ✗ 不要過：移除或改名 response 欄位
  ✗ 不要過：改 response 的外層結構（陣列 vs wrapper）
  ✗ 不要過：把 optional 欄位改成 required 或反過來
  ✗ 不要過：改欄位型別（String → Int 等）

TestFlight 過審後執行：
  rm .claude/ios-review-lock
來解除本 hook。
REASON

python3 -c "
import json, sys
reason = sys.stdin.read()
print(json.dumps({
    'hookSpecificOutput': {
        'hookEventName': 'PreToolUse',
        'permissionDecision': 'ask',
        'permissionDecisionReason': reason,
    }
}, ensure_ascii=False))
" <<< "$reason"
