# 首頁真實資料串接與景點詳情頁聯絡資訊誠實化 — 設計

日期：2026-07-10

## 背景

PM 角度盤點目前功能時發現兩個「假資料」問題：

1. 首頁「熱門打卡景點」區塊（`HotCheckInPoint`）目前吃的是 `HomeView.vue` 裡手寫死的 3 筆景點資料（`data1`），並非真實 API 資料，與後端已提供的景點資料脫鉤。
2. 景點詳情頁（`viewPoint.vue`）「服務設施」區塊顯示「服務處／公共廁所」兩個固定打勾項目，但 TDX 景點資料集裡完全沒有這類欄位（`server/data/allViewPoint.json` 只有 `ScenicSpotID/ScenicSpotName/DescriptionDetail/Phone/Address/OpenTime/Picture/Position/Class1/ParkingPosition/WebsiteUrl/SrcUpdateTime/UpdateTime`），此區塊是純虛構內容。同時詳情頁頂部的電話／網址圖示按鈕沒有綁定任何行為，點擊無反應。

本次只處理這兩個前端問題，不改動後端 API 或資料結構。

## 目標

- 首頁熱門打卡景點改為顯示真實 API 資料，移除寫死陣列。
- 詳情頁移除虛構的服務設施清單，改用資料集裡真實存在的欄位（電話、官網、停車資訊）組成「聯絡資訊」區塊。
- 詳情頁頂部電話／網址按鈕改為可點擊的真實連結。

## 非目標

- 不新增後端欄位、不改 `server/` 任何程式碼。
- 不處理地圖、篩選、分頁等其他 PM 盤點中列出的中期擴充項目。
- 不追求「服務設施」語意上的完整還原（因資料源本來就沒有這些細節），只呈現資料集裡真實存在且可驗證的欄位。

## 設計

### 1. 首頁熱門打卡景點改用真實資料

`homeViewStore`（`src/store/homeViewStore.js`）已在 store 建立時呼叫 `refreshRandomItems()` → `getRandomViewApi(3)`，並將結果（經過 `processViewData` 處理）存在 `randomThreeItems`。這份資料目前只用在景點詳情頁「這些景點大家也推薦」區塊。

改動：
- `HomeView.vue`：刪除整段寫死的 `data1` 陣列（含其 3 筆景點物件字面量）。
- `HomeView.vue`：透過既有的 `storeToRefs(homeViewStore)` 額外解構出 `randomThreeItems`，將 `<HotCheckInPoint :data="data1">` 改為 `<HotCheckInPoint :data="randomThreeItems">`。
- `HotCheckInPoint.vue` 本身不需要改動，它已經是純粹依 `data` prop 渲染卡片的元件，只要傳入符合 `processViewData` 輸出格式（`id/title/photoSrc/tagText/startNum`）的陣列即可。

已知取捨：首頁「熱門打卡景點」與詳情頁「大家也推薦」共用同一份隨機資料，同一次瀏覽中可能看到重複景點。這是刻意接受的簡化，不特別處理去重或分開請求。

### 2. 詳情頁服務設施 → 聯絡資訊

**`processList.js` 補欄位**

`processViewData`（`src/common/processList.js`）目前輸出物件缺少 `WebsiteUrl` 和 `ParkingPosition` 的轉換，需新增：

```js
websiteUrl: e.WebsiteUrl || null,
hasParking: Object.keys(e.ParkingPosition || {}).length > 0,
```

（`phone` 欄位已存在，沿用。）

**`viewPoint.vue` 頂部聯絡按鈕**

原本三個圓形圖示按鈕（電話、網址、收藏）中，電話與網址目前是純裝飾、無 `@click` 也非連結。改為：

- 電話按鈕：`renderViewData.phone` 存在時渲染為 `<a :href="'tel:' + renderViewData.phone">`；不存在則整顆按鈕不渲染。
- 網址按鈕：`renderViewData.websiteUrl` 存在時渲染為 `<a :href="renderViewData.websiteUrl" target="_blank" rel="noopener">`；不存在則不渲染。
- 收藏按鈕行為不變。

**「服務設施」區塊 → 「聯絡資訊」區塊**

移除目前寫死的服務處／公共廁所 `<ul>` 清單。改為條列真實資料：

- 電話：有值才顯示一行，文字為電話號碼，本身也是 `tel:` 連結。
- 官網：有值才顯示一行，文字固定為「官方網站」，連結到 `websiteUrl`，`target="_blank"`。
- 停車資訊：一律顯示一行，文字依 `hasParking` 顯示「有停車資訊」或「無停車資訊」（因為資料集缺乏停車場細節，只誠實呈現「有無」，不虛構車位數、費率等）。

若電話與官网兩者都沒有值（停車資訊一定會顯示，因為一律有 true/false），整個「聯絡資訊」標題與區塊仍然顯示（因為停車那行必定存在），不會出現空標題的情況。

### 影響檔案

- `src/views/HomeView.vue`
- `src/common/processList.js`
- `src/page/viewPoint.vue`

不涉及 `server/`、路由、store 新增檔案。

## 測試 / 驗證方式

專案沒有前端自動化測試框架，改用手動驗證（`/verify` 或本機瀏覽器）：

1. 首頁「熱門打卡景點」顯示的 3 筆卡片點進去可正確導向對應景點詳情頁，且不再看到 `data1` 裡的固定 3 筆（烏來瀑布／無極天元宮／內門308高地）內容寫死出現。
2. 挑一個有 `Phone`/`WebsiteUrl`/`ParkingPosition` 都齊全的景點（例如台北當代藝術館 `VCA_379000000A_000032`），確認詳情頁頂部電話按鈕點擊會觸發撥號連結、網址按鈕會開新分頁到官網，「聯絡資訊」區塊三行都正確顯示。
3. 挑一個 `Picture` 為空、缺少 `Phone`/`WebsiteUrl` 的景點（例如福正沙灘 `VCA_371030000A_000046`），確認頂部電話／網址按鈕不出現、聯絡資訊只顯示「無停車資訊」一行，畫面不留空白區塊或壞掉的連結。
