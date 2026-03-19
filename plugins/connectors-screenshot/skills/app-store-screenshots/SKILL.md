---
name: app-store-screenshots
description: Capture App Store screenshots for the Connectors iOS app in multiple languages. Automates UI navigation and screenshot capture for all 26 supported languages. Use when needing to generate or regenerate App Store promotional screenshots, update screenshots after UI changes, or capture screenshots for specific languages.
license: MIT
---

# App Store Screenshots - Connectors iOS App

自動化擷取 Connectors iOS app 的 App Store 宣傳截圖，支援 26 種語言。

## 使用方式

透過 `/connectors-app-screenshot:app-store-screenshots` 指令執行，可指定語言或擷取全部。

```
/connectors-app-screenshot:app-store-screenshots          # 全部 26 語言
/connectors-app-screenshot:app-store-screenshots en        # 只擷取英文
/connectors-app-screenshot:app-store-screenshots en,ja,ko  # 指定多語言
```

## 前置需求

- iPhone 17 Pro Max Simulator 已開啟且安裝 app
- XcodeBuildMCP tools 可用（tap, swipe, describe_ui, screenshot）
- Demo 帳號已登入（demo@ctrs.app / Demo123!）

## 截圖規格

每個語言 6 張截圖：

| # | 檔名 | 畫面內容 |
|---|------|----------|
| 1 | 01-a-core-friends.png | 關係健康度 A 級核心密友列表 |
| 2 | 02-home-bottom.png | 首頁底部（健康圈） |
| 3 | 03-contact-detail.png | 聯絡人詳情頁 |
| 4 | 04-timeline.png | 動態時間軸（含 AI 洞察） |
| 5 | 05-relationship-health-trend.png | 關係健康度趨勢分析 |
| 6 | 06-notes-tab.png | 動態筆記篩選 |

## 支援語言（26 種）

zh-Hant-TW, zh-Hans, zh-Hant-HK, en, ja, ko, de, fr, es, es-MX, it, pt, pt-BR, ru, ar, nl, tr, vi, th, hi, id, ms, my, km, lo, fil

## 核心流程

每個語言的處理流程：切換語言 → 登出重新登入 → 依序導航並擷取 6 張截圖。

詳細的導航路徑、座標、操作步驟請參考 command 檔案（`commands/app-store-screenshots.md`），其中包含完整的逐步執行指令。

## 輸出目錄

```
connectors/scripts/app-store-screenshots-v2/{language_code}/
```

## 注意事項

- 操作前一律用 `describe_ui` 取得精確座標，不要憑記憶猜測
- 導航操作後加入延遲等待動畫完成
- 每次切換語言後必須登出再重新登入，語言變更才會完整套用
