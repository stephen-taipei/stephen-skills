#!/bin/bash
# Hook: PostToolUse - Localizable.strings 編輯後檢查 key 一致性
# 當 Edit/Write 修改 .strings 檔案時，快速比對 key 數量是否與英文版一致

INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null)

# 只處理 Localizable.strings 檔案
if [[ "$FILE_PATH" != *Localizable.strings ]]; then
  exit 0
fi

# 找到英文版路徑
PROJECT_DIR="$(dirname "$0")/../.."
EN_FILE="$PROJECT_DIR/ios-swift/Connectors/Resources/en.lproj/Localizable.strings"

if [ ! -f "$EN_FILE" ]; then
  exit 0
fi

# 跳過英文檔案本身的修改
if [[ "$FILE_PATH" == *en.lproj/Localizable.strings ]]; then
  exit 0
fi

# 比較 key 數量
EN_COUNT=$(grep -c '^"' "$EN_FILE" 2>/dev/null || echo 0)
EDITED_COUNT=$(grep -c '^"' "$FILE_PATH" 2>/dev/null || echo 0)

if [ "$EN_COUNT" != "$EDITED_COUNT" ]; then
  MSG="i18n key count mismatch: en=$EN_COUNT, edited file=$EDITED_COUNT ($FILE_PATH)"
  echo "$MSG" >&2
  cat <<ENDJSON
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "$MSG. Please ensure the key count matches the English source file."
  }
}
ENDJSON
fi

exit 0
