#!/bin/bash
# Hook: PostToolUse - Swift 檔案編輯後自動驗證語法
# 當 Edit/Write 工具修改 .swift 檔案時，執行 swift build 快速檢查

INPUT=$(cat)

# 從 stdin 取得被編輯的檔案路徑
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null)

# 只處理 .swift 檔案
if [[ "$FILE_PATH" != *.swift ]]; then
  exit 0
fi

# 找到 iOS 專案目錄
PROJECT_DIR="$(dirname "$0")/../.."
IOS_DIR="$PROJECT_DIR/ios-swift/Connectors"

if [ ! -d "$IOS_DIR" ]; then
  exit 0
fi

# 使用獨立的 DerivedData，避免和 Xcode 預設 build.db 互鎖
cd "$IOS_DIR" || exit 0
DERIVED_DATA_PATH=$(mktemp -d "${TMPDIR:-/tmp}/connectors-swift-validate.XXXXXX" 2>/dev/null || mktemp -d -t connectors-swift-validate)

if [ -z "$DERIVED_DATA_PATH" ] || [ ! -d "$DERIVED_DATA_PATH" ]; then
  exit 0
fi

cleanup() {
  rm -rf "$DERIVED_DATA_PATH"
}

trap cleanup EXIT

BUILD_OUTPUT=$(xcodebuild -project "Connectors.xcodeproj" \
  -scheme "Connectors Dev" \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -derivedDataPath "$DERIVED_DATA_PATH" \
  -quiet \
  build 2>&1 | grep -E "error:" | head -10)

if [ -n "$BUILD_OUTPUT" ]; then
  echo "$BUILD_OUTPUT" >&2
  # 回傳建議給 Claude 但不阻擋操作
  cat <<ENDJSON
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "Swift build errors detected after editing $FILE_PATH:\n$BUILD_OUTPUT\nPlease fix these compilation errors."
  }
}
ENDJSON
fi

exit 0
