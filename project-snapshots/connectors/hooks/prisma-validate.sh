#!/bin/bash
# Hook: PostToolUse - Prisma schema 編輯後自動驗證
# 當 Edit/Write 工具修改 schema.prisma 時，執行 prisma validate

INPUT=$(cat)

# 從 stdin 取得被編輯的檔案路徑
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null)

# 只處理 schema.prisma 檔案
if [[ "$FILE_PATH" != *schema.prisma ]]; then
  exit 0
fi

# 找到專案根目錄
PROJECT_DIR="$(dirname "$0")/../.."

cd "$PROJECT_DIR" || exit 0

# 執行 prisma validate
VALIDATE_OUTPUT=$(npx prisma validate 2>&1)
VALIDATE_EXIT=$?

if [ $VALIDATE_EXIT -ne 0 ]; then
  echo "$VALIDATE_OUTPUT" >&2
  cat <<ENDJSON
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "Prisma schema validation failed after editing $FILE_PATH:\n$VALIDATE_OUTPUT\nPlease fix the schema errors."
  }
}
ENDJSON
fi

exit 0
