# travelTaiwan：廢棄 TDX API 改用內建 JSON + 新增 Express 後端

日期：2026-07-08
狀態：已核准設計

## 背景

- Vue 3 + Vite SPA，部署 gh-pages。
- 原資料來源 TDX API（`src/api/index.js`）已廢棄，不得使用。
- 專案內有完整 JSON 資料：`allViewPoint.json`（12MB、5108 筆景點、含 `City` 中文欄位）、`homeViewPoint.json`（首頁區域熱門）、`cityList.json`（城市中英對照）。
- 目前 12MB JSON 直接 import 進前端 bundle，首載過重。

## 目標

1. 所有資料查詢改走自建 API，資料來源為專案內 JSON。
2. JSON 搬進新後端（`server/`），前端以 axios 呼叫。
3. 順帶修正探索時發現的 bug 與死程式碼。

## 非目標

- 資料寫入（CRUD）：本次唯讀查詢，不做新增/修改/刪除。
- 雲端實際部署：本次完成程式碼與 README 部署說明，Render/Railway 部署另行。

## 架構

```
travelTaiwan/
├─ server/                 ← 新增 Express 後端（獨立 package.json）
│  ├─ index.js             Express app：cors、JSON 載入、路由
│  ├─ data/                JSON 自 src/assets/data 搬移
│  │  ├─ allViewPoint.json
│  │  ├─ homeViewPoint.json
│  │  └─ cityList.json
│  └─ package.json         依賴：express、cors
└─ src/                    前端改 call API
```

- 後端啟動時一次載入 JSON 進記憶體（12MB 無壓力），所有查詢在記憶體過濾。
- 後端 port 3000（可用 `PORT` 環境變數覆寫）。
- CORS：開發允許 localhost，部署後允許 gh-pages 網域（`https://egg8833.github.io`）。

## API 端點（全部唯讀 GET）

| 端點 | 參數 | 行為 | 取代 |
|---|---|---|---|
| `/api/scenic-spots` | `city`（英文名如 `Taipei`，必填）、`top`（預設 30） | 以 cityList 將英文名對照中文（臺北市），過濾 `City` 欄位，回前 `top` 筆 | 原 TDX `getViewApi`（viewStore） |
| `/api/scenic-spots/search` | `keyword`（必填） | `ScenicSpotName.includes(keyword)` 全量搜尋 | homeViewStore 前端 filter |
| `/api/scenic-spots/random` | `count`（預設 3） | 過濾掉 `Picture` 為空物件的項目後隨機抽 `count` 筆不重複 | `getRandomItemsFromArray` |
| `/api/scenic-spots/:id` | — | 以 `ScenicSpotID` 精確查單筆 | viewPoint.vue 前端 find |
| `/api/home-views` | — | 回傳 homeViewPoint.json 全部 | hotViewStore import |
| `/api/cities` | — | 回傳 cityList.json 全部 | viewList.vue import |

錯誤處理：

- 缺必填參數 → 400 + `{message}`。
- `:id` 查無 → 404 + `{message}`。
- 回傳格式維持 TDX 原始欄位（`ScenicSpotID`、`ScenicSpotName`…），前端 `processList.js` 轉換邏輯不動。

## 前端改動

1. `src/api/index.js` 重寫：
   - axios instance，`baseURL = import.meta.env.VITE_API_BASE || '/api'`。
   - 匯出 `getViewApi(city, top)`、`searchViewApi(keyword)`、`getRandomViewApi(count)`、`getViewByIdApi(id)`、`getHomeViewsApi()`、`getCitiesApi()`。
   - 刪除 jssha/HMAC/TDX 認證碼。
2. `vite.config.js` 加 dev proxy：`/api` → `http://localhost:3000`。
3. `.env.production` 設 `VITE_API_BASE`（先留 placeholder，部署後填雲端網址）。
4. Store 改動：
   - `viewStore.js`：`getViewApi(cityName)` 改打新端點，快取邏輯保留。
   - `homeViewStore.js`：移除 `allViewPoint.json` import；`searchTravel` 改 await search API；`randomThreeItems` 改由 async 函式打 random API（store 初始化時觸發）。
   - `hotViewStore.js`：移除 `homeViewPoint.json` import，改打 `/api/home-views`（資料存 ref，載入一次）。
5. `viewPoint.vue`：移除 `allViewPoint.json` import；`VCA` 開頭 id 與「api 景點資料」分支統一改為以 `/api/scenic-spots/:id` 取單筆（經 `processList.js` 轉換）；`moveToNewViewPoint` 改用 random API。
6. `viewList.vue`：城市清單可續用本地 `cityList.json`（4KB，留前端無妨）。
7. `package.json` 移除 `jssha` 依賴。

## 順帶修正

1. `hotViewStore.js`：
   - `selectAreaData` computed 內 `selectIndex.value = 0` 副作用 → 移除，切區域才能生效。
   - return 不存在的 `count`、`increment` → 移除。
2. 刪除死檔/死碼：
   - `src/components/card copy.vue`
   - `src/assets/data/cityData.json`（假資料，僅剩註解引用）
   - `src/assets/data/zipCode.json` + `src/common/zipCodegenerating.js`（無人引用）
   - `src/router/index.js` 的 `getDynamicBase`/`getBase` 死程式碼
   - `src/assets/data/allViewPoint.json`、`homeViewPoint.json`（搬到 server/data 後自 src 移除）
3. `viewList.vue` `renderData` computed 內呼叫 async `getViewsStoreData`（副作用）→ 改為選城市事件與 watch 觸發，computed 只讀。

## 部署

- 前端：照舊 `npm run deploy`（gh-pages）。
- 後端：README 補「本機啟動」與「Render/Railway 部署」章節；免費層有 cold start（約 30 秒喚醒）需註記。

## 測試與驗證

- 後端：`node server/index.js` 啟動後 curl 驗證六支端點（正常 + 400/404）。
- 前端：`npm run dev` 實跑三流程——首頁搜尋與隨機推薦、列表頁選城市、單一景點頁（含換頁隨機推薦）。
- build 驗證：`npm run build` 成功且 bundle 不含 12MB JSON。
