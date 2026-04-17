---
name: localize
description: "批次在地化翻譯工具。將指定內容翻譯至全部 41 種支援語言，使用分塊策略與驗證流程確保品質。支援 iOS .strings、Android XML、Web JSON、API email 格式。Use when user says \"localize\", \"translate\", \"翻譯\", \"i18n\", \"在地化\", \"batch translation\", \"多語系\", or needs to translate content to multiple languages at once."
---

# Localize - 批次在地化翻譯

當使用者呼叫此 skill 時，將指定內容在地化至全部 41 種支援語言。
使用者可指定單一平台或全平台同步。

## 支援語言 (41 種)

ar, ca, cs, da, de, el, en, es, es-MX, fi, fil, fr, he, hi, hr, hu, id, it, ja, km, ko, lo, ms, my, nb, nl, pl, pt, pt-BR, ro, ru, sk, sv, th, tr, uk, vi, zh-Hans, zh-Hant, zh-Hant-HK, zh-Hant-TW

## 支援平台 (5 個)

| 平台 | 基準檔案 | 語系路徑 | 格式 |
|------|----------|----------|------|
| iOS | `ios-swift/Connectors/Resources/en.lproj/Localizable.strings` | `ios-swift/Connectors/Resources/{lang}.lproj/Localizable.strings` | Apple .strings |
| Android | `android/app/src/main/res/values/strings.xml` | `android/app/src/main/res/values-{android_code}/strings.xml` | Android XML |
| CRM Web | `apps/crm-web/src/locales/en.json` | `apps/crm-web/src/locales/{lang}.json` | JSON (flat/nested) |
| Admin Web | `apps/admin-web/src/locales/en/translation.json` | `apps/admin-web/src/locales/{lang}/translation.json` | JSON (nested) |
| API | `apps/api/src/email/email.service.ts` 內的 `EMAIL_TRANSLATIONS` | `apps/api/src/i18n/email/{lang}.json` | JSON |

### Android 語言代碼對照表

Android 使用不同的語言代碼格式，翻譯時**必須**使用此對照表：

| 標準代碼 | Android 目錄名 | 說明 |
|----------|---------------|------|
| en | `values` (default) | 英文基準 |
| ar | `values-ar` | |
| ca | `values-ca` | |
| cs | `values-cs` | |
| da | `values-da` | |
| de | `values-de` | |
| el | `values-el` | |
| es | `values-es` | |
| es-MX | `values-es-rMX` | region 用 `-r` 前綴 |
| fi | `values-fi` | |
| fil | `values-fil` | |
| fr | `values-fr` | |
| he | `values-iw` | Android 用 `iw` 而非 `he` |
| hi | `values-hi` | |
| hr | `values-hr` | |
| hu | `values-hu` | |
| id | `values-in` | Android 用 `in` 而非 `id` |
| it | `values-it` | |
| ja | `values-ja` | |
| km | `values-km` | |
| ko | `values-ko` | |
| lo | `values-lo` | |
| ms | `values-ms` | |
| my | `values-my` | |
| nb | `values-nb` | |
| nl | `values-nl` | |
| pl | `values-pl` | |
| pt | `values-pt` | |
| pt-BR | `values-pt-rBR` | region 用 `-r` 前綴 |
| ro | `values-ro` | |
| ru | `values-ru` | |
| sk | `values-sk` | |
| sv | `values-sv` | |
| th | `values-th` | |
| tr | `values-tr` | |
| uk | `values-uk` | |
| vi | `values-vi` | |
| zh-Hans | `values-zh-rCN` | 簡體中文 |
| zh-Hant | `values-zh-rTW` | 繁體中文（通用） |
| zh-Hant-HK | `values-zh-rHK` | 繁體中文（香港） |
| zh-Hant-TW | `values-zh-rTW` | 與 zh-Hant 共用同一目錄 |

**注意**：`zh-Hant` 和 `zh-Hant-TW` 在 Android 上共用 `values-zh-rTW`，實際為 40 個目錄。

### API Email 翻譯特殊處理

API 目前的 email 翻譯硬寫在 `email.service.ts` 的 `EMAIL_TRANSLATIONS` 物件中（僅英文，14 個 key）。

**首次執行時需要重構**：
1. 建立 `apps/api/src/i18n/email/` 目錄
2. 將 `EMAIL_TRANSLATIONS` 的內容抽出為 `en.json`
3. 修改 `email.service.ts` 改為從 JSON 檔案讀取（根據 `locale` 參數）
4. 翻譯其餘 40 個語系的 JSON 檔案

**後續執行**：直接翻譯 JSON 檔案，與 CRM Web/Admin Web 相同流程。

## 執行步驟

### Phase 0 - 確認範圍

詢問使用者翻譯範圍：
- 全平台同步（5 個平台）
- 指定平台（如 `ios`、`android`、`crm-web`、`admin-web`、`api`）
- 指定新增的 key（僅翻譯差異部分）
- 全量重新翻譯

若使用者未指定，預設為**全平台差異同步**（僅翻譯缺漏的 key）。

### Phase 1 - 分析來源

對每個目標平台：
1. 讀取英文基準檔案，提取所有 key
2. 統計總行數，確定分塊策略（每塊最多 200 行）
3. 逐語系比對，識別缺漏的 key
4. 輸出分析摘要：

```
平台分析:
- iOS: 2298 keys, 41/41 語系, 0 語系有缺漏
- Android: 2235 keys, 24/41 語系, 缺少 17 語系
- CRM Web: 850 keys, 41/41 語系, 0 語系有缺漏
- Admin Web: 620 keys, 35/41 語系, 缺少 6 語系
- API: 14 keys, 需要重構
```

### Phase 2 - 平行翻譯

1. 每批次啟動最多 **5-7 個** sub-agent（不要一次啟動全部）
2. 每個 sub-agent 負責**一個語系的一個平台**
3. 大檔案（>200 行）必須使用**分塊輸出**：
   - 讀取來源檔案的對應區塊
   - 翻譯後寫入 `/tmp/{platform}_{lang}_chunk{N}` 暫存檔
   - 所有區塊完成後，使用 `cat` 合併為最終檔案
   - 清理暫存檔
4. 小檔案（≤200 行，如 Admin Web、API）可直接一次輸出
5. 等待當前批次全部完成後，再啟動下一批次
6. 如果任何 agent 卡住超過 2 分鐘，跳過並記錄以便手動重試

### 各平台格式規範

#### iOS (.strings)
```
"key_name" = "翻譯內容";
```
- 保留所有註解行
- Placeholder: `%@`, `%d`, `%lld`, `%1$@` 等必須保留

#### Android (XML)
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="key_name">翻譯內容</string>
    <string name="key_with_arg">Hello %1$s, you have %2$d items</string>
    <plurals name="plural_key">
        <item quantity="one">%d item</item>
        <item quantity="other">%d items</item>
    </plurals>
</resources>
```
- XML 特殊字元必須跳脫：`'` → `\'`, `&` → `&amp;`, `<` → `&lt;`
- Placeholder: `%1$s`, `%2$d` 等必須保留且順序不變
- `<plurals>` 的 quantity 值依語言文法調整（如阿拉伯文有 zero/one/two/few/many/other）

#### Web JSON (CRM Web / Admin Web)
```json
{
  "section.key": "翻譯內容",
  "nested": {
    "key": "翻譯內容"
  }
}
```
- 保持 JSON 結構與英文一致
- Placeholder: `{{variable}}` 必須保留

#### API Email JSON
```json
{
  "email.verify.subject": "翻譯內容",
  "email.verify.greeting": "Hello {{name}},"
}
```
- Placeholder: `{{variable}}` 必須保留

### Phase 3 - 驗證

翻譯完成後，對每個平台執行以下驗證：

1. 確認每個語系檔案的 **key 數量**與英文基準一致
2. 確認 **key 順序**與英文基準一致
3. 驗證 **placeholder token** 未在翻譯中遺失：
   - iOS: `%@`, `%d`, `%lld`, `%1$@`
   - Android: `%1$s`, `%2$d`, 以及 `<xliff:g>` 標籤
   - Web/API: `{{variable}}`
4. 檢查是否有**重複的 key**
5. Android: 驗證 XML 格式正確（無未跳脫的特殊字元）
6. 對於 App Store 文案：驗證 promo text ≤ 170 字元、keywords ≤ 100 字元
7. 產出驗證報告，列出每個語系的 pass/fail 狀態

### Phase 4 - 提交

1. 僅在驗證全部通過時才提交
2. Commit message 格式：`chore(i18n): localize [feature/platform] across N languages`
3. 若同時涵蓋多平台：拆分為每個平台一個 commit

#### Commit Message 範例

```bash
# 單一平台新增 key
git commit -m "chore(i18n): localize new reminder keys across 41 languages (iOS)"

# 多平台同步（每個平台一個 commit）
git commit -m "chore(i18n): localize subscription feature across 41 languages (iOS)"
git commit -m "chore(i18n): localize subscription feature across 41 languages (Android)"
git commit -m "chore(i18n): localize subscription feature across 41 languages (crm-web)"

# 全量重新翻譯
git commit -m "chore(i18n): re-translate all keys across 41 languages (admin-web)"

# App Store 文案
git commit -m "chore(i18n): localize App Store metadata across 41 languages"
```

#### Git Conflict 處理指引

在地化檔案因為行數多且多人可能同時修改，容易產生 merge conflict：

1. **優先使用 `git merge`，不要用 `git rebase`**：在地化 commit 通常包含大量檔案變更，rebase 容易造成逐 commit 反覆衝突
2. **Conflict 解決策略**：
   - 若 conflict 在翻譯內容：以**較新的翻譯為準**（通常是當前分支）
   - 若 conflict 在新增 key：**兩邊的 key 都要保留**，確認 key 順序與英文基準一致
   - 若 conflict 在刪除 key：確認英文基準是否仍有該 key，沒有則刪除
3. **Conflict 解決後必須重跑 Phase 3 驗證**：確保 key 數量、順序、placeholder 仍正確
4. **大量 conflict 時的快速策略**：
   ```bash
   # 以英文基準為準，重新產生翻譯檔（適用於全量翻譯場景）
   git checkout --theirs apps/crm-web/src/locales/  # 接受 incoming 的版本
   # 然後重新執行 Phase 1-3 對缺漏的 key 補翻譯
   ```

## 翻譯風格指南

### 核心語氣：像多年好友在聊天

翻譯不是在寫說明書，是在跟朋友說話。每一句都要讓使用者感覺到溫度。

**語氣光譜**：
```
冷冰冰的系統 ←----→ 溫暖的好友（我們在這裡）←----→ 過度搞笑
```

**好的翻譯**：
- 「嘿，別忘了今天要跟 John 聊聊！」
- 「太棒了！你已經連續 7 天都有跟進聯絡人了」
- 「哎呀，出了點小狀況，再試一次看看？」

**壞的翻譯**：
- 「提醒：您今日有一項與 John 的互動排程。」（太官方）
- 「錯誤：操作失敗，請重試。」（太冷漠）
- 「恭喜您！您已成功完成連續七日聯絡人跟進任務！」（太正式）

### 各場景語氣調整

| 場景 | 語氣 | 範例 |
|------|------|------|
| 日常提醒 | 輕鬆、像朋友提醒 | 「記得今天跟 Sarah 打個招呼」 |
| 成就/鼓勵 | 真心開心、帶點幽默 | 「你太厲害了吧！」 |
| 錯誤訊息 | 溫和、不責怪 | 「哎呀，好像哪裡不太對」 |
| Email 通知 | 親切但不失專業 | 「嗨 {{name}}，快來驗證你的信箱吧！」 |
| 空狀態 | 鼓勵、不讓人覺得冷清 | 「還沒有聯絡人？開始加入第一位吧！」 |

### 其他規則

- 尊重區域變體差異（如 pt-BR vs pt、zh-Hans vs zh-Hant vs zh-Hant-HK vs zh-Hant-TW）
- 技術名詞保留英文或使用當地慣用翻譯
- 翻譯結果的行數與 key 順序必須與英文來源完全一致
- 幽默感要能跨文化理解，避免只有特定文化才懂的梗
- 某些語言（如日文、韓文）的「朋友語氣」可能需要調整敬語程度，但仍要保持溫暖感

## 已知問題

- Admin Web 的 `zh-TW` 目錄命名不一致，其他平台使用 `zh-Hant-TW`。翻譯時仍使用 `zh-TW` 以維持現有結構，待統一命名後再調整。
- Android 的 `values-in`（舊 Indonesian 代碼）和 `values-id` 可能同時存在，優先使用 `values-in`（Android 慣例）。

## 錯誤恢復

### 翻譯過程中 Sub-Agent 失敗

1. **單一 agent 超時或崩潰**：記錄失敗的語系與平台，在當前批次完成後重新啟動一個 agent 補翻譯
2. **多個 agent 同時失敗**：可能是系統資源不足，將批次大小從 5-7 降至 2-3，逐批重試
3. **寫入檔案失敗（磁碟滿/權限）**：先清理 `/tmp/` 暫存檔，確認目標目錄權限後重試

### 部分翻譯失敗的重試策略

1. 記錄失敗語系清單至 `/tmp/localize_failed_langs.txt`
2. 重試時僅針對失敗語系執行，不重跑已成功的語系：
   ```bash
   # 查看失敗清單
   cat /tmp/localize_failed_langs.txt
   # 輸出格式範例：
   # ar:ios
   # km:android
   # lo:crm-web
   ```
3. 重試 2 次仍失敗的語系，手動檢查該語系檔案的格式是否有特殊問題（如 RTL 語言的雙向標記、特殊字元跳脫）
4. 最終仍無法完成的語系，在 PR description 中明確標註，避免遺忘

### Key 數量不一致時的排查步驟

當驗證發現某語系的 key 數量與英文基準不一致時：

1. **找出差異 key**：
   ```bash
   # iOS：提取 key 並比對
   grep -oP '^"[^"]+"' en.lproj/Localizable.strings | sort > /tmp/keys_en.txt
   grep -oP '^"[^"]+"' {lang}.lproj/Localizable.strings | sort > /tmp/keys_lang.txt
   diff /tmp/keys_en.txt /tmp/keys_lang.txt

   # Web JSON：提取 key 並比對
   jq -r 'paths(scalars) | join(".")' en.json | sort > /tmp/keys_en.txt
   jq -r 'paths(scalars) | join(".")' {lang}.json | sort > /tmp/keys_lang.txt
   diff /tmp/keys_en.txt /tmp/keys_lang.txt
   ```
2. **常見原因與修復**：
   - **多了 key**：翻譯時引入了英文基準已刪除的舊 key → 刪除多餘 key
   - **少了 key**：翻譯時遺漏 → 補翻譯缺少的 key
   - **重複 key**：合併時產生重複行 → 去重複，保留較新的翻譯
   - **格式錯誤導致解析失敗**：如 iOS `.strings` 缺少結尾分號、Android XML 標籤未關閉 → 修正語法錯誤後重新計數
3. **修復後重跑 Phase 3 驗證**，確認所有語系 key 數量一致
