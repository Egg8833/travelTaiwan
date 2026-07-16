# 評論過的景點清單功能設計

日期：2026-07-16

## 背景與範圍

目前 `MyJourneyView.vue`（我的旅程頁）的「護照」卡片會顯示「撰寫評論」的總數（透過 `GET /api/reviews/mine/count`），但使用者無法看到自己實際評論過哪些景點。

本次新增：在「我的收藏」區塊下方，新增「我評論過的景點」區塊，列出使用者評論過的所有景點（圖片＋名稱＋自己給的評分），點擊可進入該景點頁。

不包含：分頁（目前規模不需要）、每個景點下的評論內容摘要、按時間排序以外的排序選項。

## 現況（已確認的技術事實）

- `server/repositories/reviewsRepo.js` 已有 `countByUser(uid)`，用 `firestore.collectionGroup('entries').where('uid', '==', uid).get()` 查全站評論，回傳 `snap.size`。
- 評論文件路徑：`reviews/{spotId}/entries/{reviewId}`，文件內容只有 `uid`、`authorName`、`rating`、`content`、`isSeed`、`createdAt`、`updatedAt`，不含景點名稱/圖片。
- `server/app.js` 記憶體中已載入 `allViewPoint`（全部景點資料，含 `ScenicSpotName`、`Picture`），`/api/scenic-spots/:id` 就是用這份資料查單一景點。
- 前端 `MyJourneyView.vue` 已有「我的收藏」區塊的實作模式可直接沿用：`card` 元件 + `router-link :to="/viewList/:id"` + 空狀態文案。
- `src/store/reviewStore.js` 目前有 `myReviewCount`（呼叫 `getMyReviewCountApi`），由 `MyJourneyView.vue` 在 `onMounted` 呼叫 `fetchMyReviewCount()`。

## 架構決策：合併 `/mine/count` 與 `/mine` 為單一端點

`/api/reviews/mine/count` 和本次要新增的清單端點，兩者查的是同一份 collection-group 資料，只是回傳形狀不同。保留兩支端點等於同一份查詢重複跑兩次（一次算數量、一次拿清單），前端也要多發一次請求。

**決策**：移除 `GET /api/reviews/mine/count`，改為單一 `GET /api/reviews/mine` 回傳完整清單；前端「撰寫評論」數字改用清單長度（`reviewedSpots.length`）算出，不再是獨立 API 呼叫。

景點名稱/圖片採**讀取時 join**（不在寫入評論時把 spotName/pictureUrl 存進評論文件）：`allViewPoint` 本來就整包在後端記憶體，join 沒有額外 I/O 成本，且景點名稱永遠反映當前資料，不會有寫入當下的舊快照與現況不一致的問題。

## 資料流

### 後端

`server/repositories/reviewsRepo.js`：移除 `countByUser`，新增 `listByUser(uid)`：

```js
async listByUser(uid) {
  const snap = await firestore.collectionGroup('entries').where('uid', '==', uid).get()
  const bySpot = new Map()
  for (const doc of snap.docs) {
    const spotId = doc.ref.parent.parent.id
    const data = doc.data()
    const existing = bySpot.get(spotId)
    if (!existing || data.createdAt > existing.createdAt) {
      bySpot.set(spotId, {spotId, rating: data.rating, createdAt: data.createdAt})
    }
  }
  return [...bySpot.values()]
}
```

同一使用者對同一景點若有多筆評論（理論上不應發生，但不假設資料完整性），只保留 `createdAt` 最新的一筆。

`server/app.js`：移除 `/api/reviews/mine/count` 路由，新增：

```js
app.get('/api/reviews/mine', verifyToken, asyncHandler(async (req, res) => {
  const myReviews = await reviewsRepo.listByUser(req.uid)
  const spots = myReviews
    .map(({spotId, rating}) => {
      const spot = allViewPoint.find(s => s.ScenicSpotID === spotId)
      if (!spot) return null
      return {
        spotId,
        spotName: spot.ScenicSpotName,
        pictureUrl: Object.values(spot.Picture)[0] ?? null,
        rating,
      }
    })
    .filter(Boolean)
  res.json(spots)
}))
```

找不到對應景點資料（例如景點已從資料集下架）的評論直接濾掉，不噴錯。

`server/openapi.js`：把 `/api/reviews/mine/count` 的定義換成 `/api/reviews/mine`，回應 schema 改成物件陣列。

### 前端

`src/api/index.js`：

```js
export const getMyReviewedSpotsApi = () =>
  api.get('/reviews/mine').then(res => res.data)
```

移除 `getMyReviewCountApi`。

`src/store/reviewStore.js`：

- 移除 `myReviewCount` state 與 `fetchMyReviewCount` action。
- 新增 `reviewedSpots = ref([])` 與 `fetchReviewedSpots()`（呼叫 `getMyReviewedSpotsApi`，失敗時 `console.error` 並保持原值，比照現有 `fetchReviews` 的錯誤處理風格）。
- 新增 `myReviewCount = computed(() => reviewedSpots.value.length)`。
- `return` 裡對外仍暴露 `myReviewCount`（改為 computed），維持 `MyJourneyView.vue` 現有引用不用改。

`src/views/MyJourneyView.vue`：

- `onMounted` 裡把 `reviewStore.fetchMyReviewCount()` 換成 `reviewStore.fetchReviewedSpots()`。
- 在「我的收藏」`<section>` 之後，新增結構相同的「我評論過的景點」`<section>`：
  - 空狀態：「還沒有留下任何評論，去景點頁分享你的旅行故事吧！」
  - 有資料時：`v-for` 走 `reviewStore.reviewedSpots`，`toReviewCardData(spot)` 組出 `card` 元件要的 `{id: spot.spotId, title: spot.spotName, photoSrc: [spot.pictureUrl 或 noImage], tagText: [], startNum: spot.rating}`，包在 `router-link :to="/viewList/:spotId"` 裡，跟收藏區塊寫法一致。

## 錯誤處理

- `GET /api/reviews/mine` 沿用 [server/app.js](server/app.js) 既有的 `asyncHandler` + 全域錯誤 middleware，查詢失敗回 500，不會讓 process crash。
- 前端 `fetchReviewedSpots` 失敗僅 log 錯誤，畫面上維持空清單狀態（不擋整頁），跟現有 `fetchReviews`/`fetchFavorites` 的錯誤處理風格一致。

## 測試計畫

- 後端：`server/app.test.js` 移除 `/api/reviews/mine/count` 的測試，新增 `/api/reviews/mine` 測試：
  - 未帶 token → 401
  - 回傳跨景點清單，且同一景點多筆評論只留最新一筆
  - 評論對應的景點在 `allViewPoint` 裡找不到時被濾掉
- 前端：手動在瀏覽器裡確認「我評論過的景點」區塊在有/無評論兩種狀態下正確顯示，且點擊卡片正確導到景點頁；確認護照卡片的「撰寫評論」數字與清單筆數一致。

## 待確認事項（已在對話中拍板，此處僅記錄）

- 顯示位置：`MyJourneyView.vue` 內新增區塊（非獨立頁面）。
- 每個項目顯示內容：圖片＋景點名稱，點擊連到景點頁（不在清單上直接顯示評論內容）。
- 合併 `/api/reviews/mine/count` 與清單端點為單一 `/api/reviews/mine`，避免重複查詢。
- 景點名稱/圖片採讀取時 join，不在評論文件寫入時做快照。
