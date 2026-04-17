使用 asc-metadata-updater skill 批次更新 App Store Connect 多語系元資料。

執行步驟：
1. 讀取 asc-metadata-updater skill 取得完整流程指引
2. 執行 `prepare_asc_data.py` 從 `docs/app-store/finished/` 產生 JSON
3. 確認 Chrome 已開啟 ASC 頁面且 Claude-in-Chrome 已連線
4. 透過 JS injection 取得 localization IDs（`_vLocMap` 或 `_aiLocMap`）
5. 啟動 CORS server，讓瀏覽器 fetch 本地 JSON
6. 分批執行 PATCH API（每批 10-12 語系）
7. 確認全部語系回傳 OK 200
8. 關閉 CORS server

參數 $ARGUMENTS：可指定 "description"（版本頁描述）、"app-info"（App 名稱/副標題）、或 "all"（全部）。預設為 "all"。
