---
name: app-store-screenshots
description: Capture App Store screenshots for the Connectors iOS app in multiple languages. Automates UI navigation and screenshot capture for all 27 supported languages.
license: MIT
---

# App Store Screenshots - Connectors iOS App

This skill automates the capture of App Store promotional screenshots for the Connectors iOS app across all 27 supported languages.

## Prerequisites

- **iPhone 17 Pro Max Simulator** running and app installed
- **XcodeBuildMCP tools** available (tap, swipe, describe_ui, screenshot)
- **Demo account** logged in (demo@ctrs.app / Demo123!)

## Supported Languages (27 total)

| Code | Language |
|------|----------|
| zh-Hant-TW | 繁體中文 (台灣) |
| zh-Hans | 简体中文 |
| zh-Hant-HK | 繁體中文 (香港) |
| en | English |
| ja | 日本語 |
| ko | 한국어 |
| de | Deutsch |
| fr | Français |
| es | Español |
| es-MX | Español (México) |
| it | Italiano |
| pt | Português |
| pt-BR | Português (Brasil) |
| ru | Русский |
| ar | العربية |
| nl | Nederlands |
| tr | Türkçe |
| vi | Tiếng Việt |
| th | ไทย |
| hi | हिन्दी |
| id | Bahasa Indonesia |
| ms | Bahasa Melayu |
| my | မြန်မာ |
| km | ភាសាខ្មែរ |
| lo | ລາວ |
| fil | Filipino |

## Screenshot Specifications

**Total**: 6 screenshots per language

| # | Filename | Navigation Path | Description |
|---|----------|-----------------|-------------|
| 1 | 01-a-core-friends.png | 小天地 → 滑到底 → 關係健康度 → A 核心密友 | Relationship health A-grade friends list |
| 2 | 02-home-bottom.png | 小天地 → 滑到底 | Home page bottom (health rings) |
| 3 | 03-contact-detail.png | 朋友圈 → 點擊第一位聯絡人 | Contact detail page |
| 4 | 04-timeline.png | 動態 → 點擊「全部」tab | Timeline with AI insights |
| 5 | 05-relationship-health-trend.png | 朋友圈 → 李美玲 → 關係健康度 | Relationship health analysis |
| 6 | 06-notes-tab.png | 動態 → 筆記 tab | Timeline notes filter |

## Output Directory Structure

```
scripts/app-store-screenshots-v2/
├── zh-Hant-TW/
│   ├── 01-a-core-friends.png
│   ├── 02-home-bottom.png
│   ├── 03-contact-detail.png
│   ├── 04-timeline.png
│   ├── 05-relationship-health-trend.png
│   └── 06-notes-tab.png
├── en/
│   └── ...
└── [other-language-codes]/
```

## Execution Steps

### Step 0: Load Required Tools

```
ToolSearch: select:mcp__XcodeBuildMCP__tap
ToolSearch: select:mcp__XcodeBuildMCP__swipe
ToolSearch: select:mcp__XcodeBuildMCP__describe_ui
ToolSearch: select:mcp__XcodeBuildMCP__screenshot
```

### Step 1: Initialize Language Loop

For each language in the supported languages list:

1. Create output directory:
   ```bash
   mkdir -p scripts/app-store-screenshots-v2/{language_code}
   ```

2. Navigate to language settings and switch language

### Step 2: Switch Language

**Navigation Path**: 個人中心 → 語言 → Select target language

```
1. Tap "個人中心" tab (x=396, y=905)
2. Use describe_ui to find "語言" row
3. Tap "語言" row to open language picker
4. Use describe_ui to find target language in list
5. Tap target language to select
6. Wait 1-2 seconds for UI to update
7. Dismiss picker (tap "完成" or swipe down)
8. Proceed to logout + demo login (Step 2.5)
```

### Step 2.5: Logout + Demo Login (Required After Each Language Switch)

**Why**: Language changes only fully apply after a fresh session.

```
1. Stay in "個人中心" tab (x=396, y=905)
2. Scroll down to the bottom (swipe up if needed)
3. Use describe_ui to find "登出" / "退出登入" / "Log out"
4. Tap logout button and confirm if a dialog appears
5. Wait for the login screen to appear
6. Use describe_ui to find "試用DEMO" / "Try DEMO" button
7. Tap "試用DEMO" to re-login
8. Wait 1-2 seconds for home screen to load
```

**Tab Bar Coordinates** (iPhone 17 Pro Max, 440x956):
- 小天地: x=44, y=905
- 朋友圈: x=132, y=905
- 動態: x=220, y=905
- 小計畫: x=308, y=905
- 個人中心: x=396, y=905

### Step 3: Capture Screenshot Set

Execute the following sequence for each screenshot:

#### Screenshot 1: A Core Friends (01-a-core-friends.png)
```
1. Tap 小天地 tab (x=44, y=905)
2. Swipe up to scroll to bottom (y: 700 → 300, repeat if needed)
3. Use describe_ui to find "關係健康度" section
4. Tap on "關係健康度" to expand
5. Tap "A" segment to show A-grade friends
6. Capture screenshot
```

#### Screenshot 2: Home Bottom (02-home-bottom.png)
```
1. Tap 小天地 tab (x=44, y=905)
2. Swipe up to scroll to bottom
3. Capture screenshot (showing health rings and recent chats)
```

#### Screenshot 3: Contact Detail (03-contact-detail.png)
```
1. Tap 朋友圈 tab (x=132, y=905)
2. Use describe_ui to find first contact
3. Tap first contact to open detail
4. Capture screenshot
5. Navigate back (swipe right or tap back button)
```

#### Screenshot 4: Timeline (04-timeline.png)
```
1. Tap 動態 tab (x=220, y=905)
2. Use describe_ui to find "全部" tab
3. Tap "全部" tab to ensure it's selected
4. Capture screenshot
```

#### Screenshot 5: Relationship Health Trend (05-relationship-health-trend.png)
```
1. Tap 朋友圈 tab (x=132, y=905)
2. Use describe_ui to find "李美玲" contact
3. Tap "李美玲" to open detail
4. Use describe_ui to find "關係健康度" button
5. Tap "關係健康度" to open analysis modal
6. Capture screenshot
7. Dismiss modal (swipe down)
8. Navigate back
```

#### Screenshot 6: Notes Tab (06-notes-tab.png)
```
1. Tap 動態 tab (x=220, y=905)
2. Use describe_ui to find filter tabs
3. Tap "筆記" tab (approximately x=220, y=277)
4. Capture screenshot
```

### Step 4: Save Screenshot

Use simctl to save directly to target directory:
```bash
xcrun simctl io booted screenshot /path/to/scripts/app-store-screenshots-v2/{lang_code}/{filename}.png
```

### Step 5: Repeat for All Languages

Loop through all 27 languages and repeat Steps 2-4.

## Important Notes

### UI Element Detection
- **Always use `describe_ui`** before tapping to get precise coordinates
- **Never guess coordinates** from screenshots - use accessibility data
- **Multiple elements with same label**: Use x,y coordinates instead of label

### Timing
- Add `postDelay: 1` after navigation taps
- Wait for UI animations to complete before capturing
- Language switch requires app UI refresh (1-2 seconds)
- After each language switch, **logout and re-login via "試用DEMO"** before taking screenshots

### Error Handling
- If an element is not found, use `describe_ui` to inspect current state
- If tap fails, verify coordinates with latest `describe_ui` output
- For modal dismissal, try swipe down gesture

### Screenshot Quality
- Ensure no modals/alerts are visible unless intentional
- Verify correct language is displayed before capture
- Check that demo data is properly populated

## Example Commands

```bash
# Load XcodeBuildMCP tools
ToolSearch: select:mcp__XcodeBuildMCP__tap

# Tap with post-delay
mcp__XcodeBuildMCP__tap(x=220, y=905, postDelay=1)

# Swipe up gesture
mcp__XcodeBuildMCP__swipe(startX=220, startY=700, endX=220, endY=300, duration=0.3)

# Get UI hierarchy
mcp__XcodeBuildMCP__describe_ui()

# Save screenshot
xcrun simctl io booted screenshot /path/to/file.png
```

## Batch Execution

For automated batch processing across all languages:

```bash
# Language codes array
LANGUAGES=(zh-Hant-TW zh-Hans zh-Hant-HK en ja ko de fr es es-MX it pt pt-BR ru ar nl tr vi th hi id ms my km lo fil)

for LANG in "${LANGUAGES[@]}"; do
    # Create directory
    mkdir -p scripts/app-store-screenshots-v2/$LANG

    # Execute screenshot sequence (via Claude automation)
    # ...
done
```

## Checklist

- [ ] Simulator is running iPhone 17 Pro Max
- [ ] App is installed and demo account logged in
- [ ] Demo data is seeded (contacts, interactions, posts)
- [ ] XcodeBuildMCP tools are loaded
- [ ] Output directories created
- [ ] All 27 languages captured
- [ ] 6 screenshots per language (162 total screenshots)
