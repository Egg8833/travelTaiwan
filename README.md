# 作品說明

The F2E 台灣旅遊景點服務，串接交通部 TDX 開放資料，

提供旅遊導覽介紹網站，串接交通部TDX的API資料，將取得資料渲染於頁面中展示

可依照不同縣市或搜尋關鍵字來取得想要的旅遊資訊。

此作品全站為RWD響應式頁面。

![image](./src/assets/images/readme01.png)


## 網站 Demo
[githubpage](https://egg8833.github.io/travelTaiwan/)


# 作品使用技術與環境說明
* 以 vue3 環境建立 使用composition api開發 並以Uno Css撰寫樣式 輔以Scss編寫樣式。
* Vite
* VueUse
* VueRouter
* pinia
* Axios
* JsSHA
* UnoCss
* ESlint
* SCSS


# 串接 API 資料

## TDX
### v2 (https://tdx.transportdata.tw/api-service/swagger/basic/cd0226cf-6292-4c35-8a0d-b595f0b15352#/Tourism/TourismApi_ScenicSpot_2240)

```
取得所有觀光景點資料
- Tourism/TourismApi_ScenicSpot_2240

```

## 後端 API（server/）

景點資料改由本地 Express 後端提供（原 TDX API 已廢棄）。

### 本機啟動

```bash
cd server
npm install
npm start        # http://localhost:3000
npm test         # 執行 API 測試
```

前端 dev server（`npm run dev`）已設定 proxy，`/api` 自動轉發到 `localhost:3000`。

### 端點

- `GET /api/scenic-spots?city=Taipei&top=30` — 依城市查景點
- `GET /api/scenic-spots/search?keyword=沙灘` — 名稱搜尋
- `GET /api/scenic-spots/random?count=3` — 隨機推薦（僅含有圖片的景點）
- `GET /api/scenic-spots/:id` — 單筆景點
- `GET /api/home-views` — 首頁區域熱門資料
- `GET /api/cities` — 城市清單

### API 文件（Swagger）

後端啟動後開啟 [http://localhost:3000/api-docs](http://localhost:3000/api-docs) 可瀏覽互動式 Swagger UI；
原始 OpenAPI 3.0 spec 在 `GET /api/openapi.json`（定義檔：`server/openapi.js`）。

### 雲端部署（Render/Railway）

1. 部署 `server/` 目錄（start command: `npm start`，`PORT` 由平台注入）。
2. 前端 `.env.production` 的 `VITE_API_BASE` 改為後端網址（例：`https://xxx.onrender.com/api`）後重新 `npm run deploy`。
3. 免費層有 cold start（閒置後首次請求約需 30 秒喚醒）。