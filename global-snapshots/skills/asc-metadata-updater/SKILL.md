---
name: asc-metadata-updater
description: 批次更新 App Store Connect 多語系元資料（App Name、Subtitle、Description、Keywords、Promotional Text）。透過 Claude-in-Chrome 借用 ASC 登入 session 直接呼叫內部 REST API。Use when user says "update app store", "push to ASC", "更新 App Store", "推送 ASC", "app store metadata", "ASC 元資料", "更新 ASC", "上架文案", "update-asc", "asc-metadata".
---

# ASC Metadata Updater

透過 Claude-in-Chrome + CORS local server 批次更新 App Store Connect 多語系元資料。

## 前置條件

- Chrome 已登入 ASC，Claude-in-Chrome 擴充套件已連線
- ASC 頁面已開啟至目標 App（版本頁或 App 資訊頁）
- `docs/app-store/finished/app-info-*.txt` 已備妥

### Extension 連線檢查

開始任何操作前，**必須先驗證 Claude-in-Chrome extension 連線狀態**：

1. **嘗試讀取當前頁面**：使用 `mcp__claude-in-chrome__read_page` 或 `mcp__claude-in-chrome__get_page_text`
   - 成功回傳頁面內容 → 連線正常，繼續流程
   - 回傳錯誤或 timeout → 進入修復流程
2. **修復連線**：
   - 確認 Chrome 是否開啟 → 若未開啟，提示用戶開啟 Chrome
   - 確認 extension 是否啟用 → 請用戶檢查 Chrome 工具列的 Claude-in-Chrome 圖示
   - 嘗試 `mcp__claude-in-chrome__tabs_context_mcp` 取得 tab 列表 → 若失敗，請用戶重新載入 extension
3. **驗證 ASC 登入狀態**：讀取頁面後，檢查是否包含 ASC 導覽列內容（非登入頁）
   - 若顯示登入頁 → 提示用戶完成 2FA 登入後再繼續

> **禁止在連線未確認的情況下執行任何 JS injection 或 PATCH 操作。**

## 流程

### 1. 準備資料

```bash
python3 <skill_path>/scripts/prepare_asc_data.py <project_root> /tmp/asc_update_data.json
```

驗證字元限制：appName ≤30, subtitle ≤30, promotionalText ≤170, keywords ≤100, description ≤4000。超過需先精簡。

### 2. 取得 Localization IDs

**版本頁 Description/Promotional Text：**
```js
(async()=>{const r=await fetch('/iris/v1/appStoreVersions/{VERSION_ID}?include=appStoreVersionLocalizations');const d=await r.json();const m={};d.included.filter(i=>i.type==='appStoreVersionLocalizations').forEach(l=>m[l.attributes.locale]=l.id);window._vLocMap=m;return Object.keys(m).length+' locales'})()
```

**App 資訊頁 Name/Subtitle/Keywords：**
```js
(async()=>{const r=await fetch('/iris/v1/apps/{APP_ID}/appInfos?include=appInfoLocalizations');const d=await r.json();const m={};d.included.filter(i=>i.type==='appInfoLocalizations').forEach(l=>m[l.attributes.locale]=l.id);window._aiLocMap=m;return Object.keys(m).length+' locales'})()
```

VERSION_ID 和 APP_ID 從 ASC URL 取得。

### 3. CORS Server + 批次 PATCH

啟動 CORS server（解決跨域問題）：
```bash
python3 <skill_path>/scripts/cors_server.py 8765 /tmp &
```

瀏覽器中 fetch 資料：
```js
(async()=>{const r=await fetch('http://127.0.0.1:8765/asc_update_data.json');window._data=await r.json();return Object.keys(window._data).length+' locales'})()
```

批次 PATCH（每批 10-12 語系）：
```js
(async()=>{const locs=Object.keys(window._data).slice(START,END);const r=[];for(const l of locs){const id=window._vLocMap[l];if(!id){r.push(l+':NO_ID');continue}const p={data:{type:'appStoreVersionLocalizations',id,attributes:{description:window._data[l].description}}};const resp=await fetch('/iris/v1/appStoreVersionLocalizations/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});r.push(l+':'+(resp.ok?'OK':'FAIL')+resp.status)}return r.join(' | ')})()
```

App 資訊頁 PATCH 用 `appInfoLocalizations` type，attributes 為 `{name, subtitle, keywords}`。

### 4. 收尾

```bash
pkill -f cors_server.py
```

## CORS Server 安全說明

CORS local server 是一個臨時 HTTP server，僅用於讓瀏覽器 fetch 本地 JSON 檔案。需注意以下安全事項：

| 項目 | 說明 |
|------|------|
| **綁定位址** | 僅綁定 `127.0.0.1`（localhost），不接受外部連線 |
| **服務目錄** | 僅服務 `/tmp` 目錄下的指定 JSON 檔，不暴露其他檔案系統路徑 |
| **生命週期** | 任務完成後**必須立即關閉**（`pkill -f cors_server.py`），不得持續運行 |
| **Port 衝突** | 預設使用 8765 port；若被佔用，改用 8766-8769 |
| **敏感資料** | `/tmp/asc_update_data.json` 僅包含 App Store 公開文案，不含密鑰或憑證 |

> **原則**：CORS server 是一次性工具，用完即關。不要在背景長期運行。

## Batch Error 處理與 Rollback

### 錯誤偵測

每批 PATCH 完成後，解析回傳結果：

```
OK 結果格式：  locale:OK200
失敗結果格式：locale:FAIL{status_code}
缺少 ID 格式：locale:NO_ID
```

### 錯誤分級處理

| 錯誤類型 | HTTP Status | 處理方式 |
|----------|-------------|----------|
| **認證過期** | 401 / 403 | 立即停止所有批次，提示用戶重新登入 ASC（2FA） |
| **Rate Limit** | 429 | 暫停 30 秒後重試當前批次；連續 3 次 429 → 停止並等待 5 分鐘 |
| **Server Error** | 500 / 503 | 記錄失敗語系，完成其他批次後，單獨重試失敗的語系 |
| **Validation Error** | 400 / 409 | 記錄錯誤訊息（通常是字元超限或格式不符），跳過該語系，繼續其他語系 |
| **找不到 ID** | NO_ID | 記錄該語系，可能是 ASC 未啟用該語系，不重試 |

### Rollback 策略

由於 ASC API 不支援交易式 rollback，採用以下補償策略：

1. **PATCH 前備份**：在執行任何 PATCH 之前，先 GET 所有語系的現有值並存入 `/tmp/asc_backup_{timestamp}.json`
   ```js
   // 備份版本頁現有資料
   (async()=>{const r=await fetch('/iris/v1/appStoreVersions/{VERSION_ID}?include=appStoreVersionLocalizations');const d=await r.json();const backup={};d.included.filter(i=>i.type==='appStoreVersionLocalizations').forEach(l=>backup[l.attributes.locale]={id:l.id,...l.attributes});window._backup=backup;await fetch('http://127.0.0.1:8765/save',{method:'POST',body:JSON.stringify(backup)});return 'backed up '+Object.keys(backup).length+' locales'})()
   ```

2. **部分失敗時**：
   - 記錄所有已成功 PATCH 的語系與失敗語系
   - 向用戶回報：「已更新 N/41 語系，以下 M 個語系失敗：[列表]」
   - 提供重試失敗語系的 JS snippet

3. **完全 Rollback**（用戶要求回復時）：
   - 從 `/tmp/asc_backup_{timestamp}.json` 讀取備份
   - 對所有已修改的語系執行反向 PATCH，還原為備份值
   - Rollback 同樣分批執行（每批 10-12 語系）

> **重要**：備份檔保留至少 24 小時。任務完成後提醒用戶備份檔位置。

### 斷點續傳

若流程中途中斷（網路斷線、extension 斷開等）：
1. 已完成的批次不需重做
2. 記錄最後成功的批次 index
3. 恢復連線後，從中斷點的下一批繼續

## 注意事項

- JS injection 單次 payload 勿超過 ~6KB，否則 Chrome extension 斷線
- 每批 10-12 語系避免逾時
- 版本頁 = `appStoreVersionLocalizations`，App 資訊頁 = `appInfoLocalizations`
- Playwright 不適合此場景（ASC 需 Apple 2FA 認證）

## 錯誤恢復

當流程因任何原因失敗或中斷時，依以下順序進行恢復：

### 1. 確認中斷點

```bash
# 檢查是否有備份檔
ls -la /tmp/asc_backup_*.json

# 檢查 CORS server 是否還在運行
lsof -i :8765
```

### 2. 恢復 Extension 連線

若 Claude-in-Chrome 斷線：
1. 請用戶重新整理 ASC 頁面
2. 重新執行 Extension 連線檢查（見前置條件段落）
3. 確認 ASC session 仍有效（非登入頁）

### 3. 還原已修改的語系（Rollback）

若需回復到更新前的狀態：

```bash
# 找到最近的備份
BACKUP=$(ls -t /tmp/asc_backup_*.json | head -1)
echo "使用備份: $BACKUP"
```

在瀏覽器中載入備份並反向 PATCH：
```js
// 載入備份資料
(async()=>{const r=await fetch('http://127.0.0.1:8765/'+window._backupFile);window._restoreData=await r.json();return 'loaded '+Object.keys(window._restoreData).length+' locales for restore'})()
```

```js
// 反向 PATCH 還原（每批 10-12 語系）
(async()=>{const locs=Object.keys(window._restoreData).slice(START,END);const r=[];for(const l of locs){const d=window._restoreData[l];const p={data:{type:'appStoreVersionLocalizations',id:d.id,attributes:{description:d.description,promotionalText:d.promotionalText}}};const resp=await fetch('/iris/v1/appStoreVersionLocalizations/'+d.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});r.push(l+':'+(resp.ok?'OK':'FAIL')+resp.status)}return r.join(' | ')})()
```

### 4. 重試失敗語系

若部分語系失敗但不需完全 rollback：
1. 從錯誤報告中取得失敗語系列表
2. 確認失敗原因（認證、Rate Limit、Validation）
3. 修正問題後，僅對失敗語系重新執行 PATCH

### 5. 清理

```bash
# 關閉 CORS server（若仍在運行）
pkill -f cors_server.py

# 備份檔保留 24 小時後可手動清除
# rm /tmp/asc_backup_*.json
# rm /tmp/asc_update_data.json
```

> **注意**：任何恢復操作前都應確認 Extension 連線正常且 ASC session 有效。若 session 過期，所有 API 呼叫都會回傳 401。

## Scripts

- `scripts/cors_server.py` — CORS HTTP server，讓瀏覽器 fetch 本地 JSON
- `scripts/prepare_asc_data.py` — 解析 `docs/app-store/finished/` 產生 ASC 更新用 JSON
