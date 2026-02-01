---
description: Capture App Store screenshots for Connectors iOS app across all 27 supported languages
argument-hint: [language_code] (optional, defaults to all languages)
allowed-tools: [Bash, Read, Write, ToolSearch, mcp__XcodeBuildMCP__tap, mcp__XcodeBuildMCP__swipe, mcp__XcodeBuildMCP__describe_ui, mcp__XcodeBuildMCP__screenshot]
model: sonnet
---

# App Store Screenshots - Connectors iOS App

Automate the capture of App Store promotional screenshots for all 27 supported languages.

## Arguments

- **No argument**: Capture all 27 languages sequentially
- **Single language code**: e.g., `en`, `ja`, `zh-Hans` - capture only that language
- **Multiple codes**: e.g., `en,ja,ko` - capture specified languages

## User Request

Capture screenshots for: **$ARGUMENTS**

## Prerequisites Check

Before starting, verify:
1. iPhone 17 Pro Max Simulator is running
2. App is installed with demo account logged in
3. Demo data is seeded

## Execution Flow

### Step 1: Load XcodeBuildMCP Tools

```
ToolSearch: select:mcp__XcodeBuildMCP__tap
ToolSearch: select:mcp__XcodeBuildMCP__swipe
ToolSearch: select:mcp__XcodeBuildMCP__describe_ui
ToolSearch: select:mcp__XcodeBuildMCP__screenshot
```

### Step 2: Determine Languages to Process

**All 27 supported languages:**
```
zh-Hant-TW, zh-Hans, zh-Hant-HK, en, ja, ko, de, fr, es, es-MX,
it, pt, pt-BR, ru, ar, nl, tr, vi, th, hi, id, ms, my, km, lo, fil
```

If `$ARGUMENTS` specifies language codes, filter to only those.

### Step 3: For Each Language

Execute the following sequence:

#### 3.1 Create Output Directory
```bash
mkdir -p /Users/stephen.chuang/Downloads/website/connectors/scripts/app-store-screenshots-v2/{language_code}
```

#### 3.2 Switch Language
1. Tap 個人中心 tab (x=396, y=905)
2. Scroll down if needed to find 語言 row
3. Use `describe_ui` to locate 語言 button
4. Tap to open language picker
5. Use `describe_ui` to find target language in list
6. Scroll list if needed to find language
7. Tap target language
8. Wait for UI refresh (postDelay=2)
9. Logout and re-login via 試用DEMO (required after each language switch)

#### 3.2.1 Logout + Demo Login (Required After Each Language Switch)
1. Stay in 個人中心 tab (x=396, y=905)
2. Scroll down to the bottom (swipe up if needed)
3. Use `describe_ui` to find 登出 / 退出登入 / Log out
4. Tap logout and confirm if a dialog appears
5. Wait for the login screen to appear
6. Use `describe_ui` to find 試用DEMO / Try DEMO
7. Tap 試用DEMO to re-login
8. Wait 1-2 seconds for home screen to load

#### 3.3 Capture 6 Screenshots

**Screenshot 1: A Core Friends (01-a-core-friends.png)**
```
Navigation: 小天地 → 滑到底 → 關係健康度 → A 核心密友
1. Tap 小天地 (x=44, y=905)
2. Swipe up to bottom (multiple times if needed)
3. describe_ui to find 關係健康度
4. Tap 關係健康度 section
5. Tap "A" segment
6. xcrun simctl io booted screenshot {path}/01-a-core-friends.png
```

**Screenshot 2: Home Bottom (02-home-bottom.png)**
```
Navigation: 小天地 → 滑到底
1. Tap 小天地 (x=44, y=905)
2. Swipe up to show bottom content
3. xcrun simctl io booted screenshot {path}/02-home-bottom.png
```

**Screenshot 3: Contact Detail (03-contact-detail.png)**
```
Navigation: 朋友圈 → 第一位聯絡人
1. Tap 朋友圈 (x=132, y=905)
2. describe_ui to find first contact
3. Tap first contact
4. xcrun simctl io booted screenshot {path}/03-contact-detail.png
5. Navigate back (swipe right from left edge)
```

**Screenshot 4: Timeline (04-timeline.png)**
```
Navigation: 動態 → 點擊「全部」tab
1. Tap 動態 (x=220, y=905)
2. describe_ui to find 全部 tab
3. Tap 全部 tab to ensure it's selected
4. xcrun simctl io booted screenshot {path}/04-timeline.png
```

**Screenshot 5: Relationship Health Trend (05-relationship-health-trend.png)**
```
Navigation: 朋友圈 → 李美玲 → 關係健康度
1. Tap 朋友圈 (x=132, y=905)
2. describe_ui to find 李美玲
3. Tap 李美玲
4. describe_ui to find 關係健康度 button
5. Tap 關係健康度
6. xcrun simctl io booted screenshot {path}/05-relationship-health-trend.png
7. Swipe down to dismiss modal
8. Navigate back
```

**Screenshot 6: Notes Tab (06-notes-tab.png)**
```
Navigation: 動態 → 筆記 tab
1. Tap 動態 (x=220, y=905)
2. describe_ui to find 筆記 tab
3. Tap 筆記 tab (approximately x=220, y=277)
4. xcrun simctl io booted screenshot {path}/06-notes-tab.png
```

### Step 4: Report Progress

After each language, report:
- Language completed
- Number of screenshots captured
- Any errors encountered

### Step 5: Final Summary

After all languages are processed, provide:
- Total screenshots captured
- Languages completed successfully
- Any failed languages or missing screenshots

## Tab Bar Coordinates (iPhone 17 Pro Max, 440x956)

| Tab | X | Y |
|-----|---|---|
| 小天地 | 44 | 905 |
| 朋友圈 | 132 | 905 |
| 動態 | 220 | 905 |
| 小計畫 | 308 | 905 |
| 個人中心 | 396 | 905 |

## Output Path

```
/Users/stephen.chuang/Downloads/website/connectors/scripts/app-store-screenshots-v2/{language_code}/
```

## Error Handling

- **Element not found**: Use `describe_ui` to inspect current UI state
- **Tap failed**: Retry with coordinates from latest `describe_ui`
- **Modal stuck**: Try swipe gestures to dismiss
- **Language not in list**: Scroll the language picker list
- **App crashed**: Note the error and skip to next language

## Important Notes

1. **Always use `describe_ui`** before tapping to get accurate coordinates
2. **Add delays** after navigation to allow UI animations
3. **Verify language** before capturing screenshots
4. **Save screenshots immediately** after each capture
