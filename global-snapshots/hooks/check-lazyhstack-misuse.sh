#!/bin/bash
# Hook: 偵測 SwiftUI LazyHStack 被誤用為 tab/filter selector
# 觸發時機: PostToolUse (Write|Edit) 寫入 .swift 檔案時
# 問題: LazyHStack 在 ScrollView(.horizontal) 中不約束高度，與 TabView(.page) 並列會造成巨大空白

FILE_PATH="${TOOL_INPUT_FILE_PATH:-}"

# 只檢查 .swift 檔案
if [[ "$FILE_PATH" != *.swift ]]; then
  exit 0
fi

# 只檢查 ios-swift 目錄
if [[ "$FILE_PATH" != *ios-swift* ]]; then
  exit 0
fi

# 檢查檔案是否包含 LazyHStack 在 ScrollView(.horizontal) 中的可疑用法
if grep -q "LazyHStack" "$FILE_PATH" 2>/dev/null; then
  # 檢查是否同時有 ScrollView(.horizontal) 和 LazyHStack 的組合
  if grep -B5 "LazyHStack" "$FILE_PATH" | grep -q "ScrollView(.horizontal"; then
    # 檢查是否為少量元素的 tab/filter 場景（有 ForEach + allCases 或 enum）
    LAZY_COUNT=$(grep -c "LazyHStack" "$FILE_PATH")
    echo "⚠️ 偵測到 $LAZY_COUNT 處 LazyHStack 在 ScrollView(.horizontal) 中。"
    echo "如果用作 tab/filter selector（少量固定元素），應改用 HStack 以避免高度不約束導致空白佈局。"
    echo "詳見：LazyHStack 不會自動收縮高度，與 TabView(.page) 等 flexible view 並列時會貪婪擴展。"
  fi
fi

exit 0
