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

## 架構決策：同一使用者對同一景點只能有一筆評論，於寫入時強制

目前 `POST /api/reviews/:spotId`（[server/app.js:87-100](server/app.js#L87-L100)）沒有任何檢查，同一使用者可以對同一景點無限次新增評論——`viewPoint.vue` 的送出表單也不管使用者是否已經留過評論，永遠顯示「新增評論」。這代表「一景點一評論」目前只是假設，不是事實，清單功能上線後可能顯示出重複資料。

**決策**：把這個限制在寫入端做成真正的約束，而不是在讀取端（`listByUser`）用「取最新一筆」防禦性地掩蓋問題。

- 後端：`reviewsRepo.add` 新增前先查詢該 uid 在該 spotId 是否已有評論，若有回傳 `{error: 'duplicate'}`（比照 `update`/`remove` 現有的 result-object 錯誤模式，不用 throw）。
- 路由：`POST /api/reviews/:spotId` 收到 `duplicate` 錯誤回 409，訊息「你已經評論過這個景點了」。
- 前端：`viewPoint.vue` 依 `reviewStore.reviews` 判斷目前登入者是否已有評論（`reviews.find(r => r.uid === authStore.user?.uid)`），有的話直接隱藏「新增評論」表單，只顯示自己那則評論的編輯/刪除按鈕（沿用現有的 `startEdit`/`saveEdit` UI）。409 只當成競態情況（例如雙分頁同時送出）的最後防線，正常操作路徑不會摸到它，但 `reviewStore.addReview` 仍需處理該狀態並跳出對應提示，而不是顯示「送出評論失敗，請稍後再試」這種誤導訊息。

有了這層保證後，`listByUser` 不需要再做「同 spotId 取最新一筆」的去重邏輯，一個 spotId 對應剛好一筆評論。

## 資料流

### 後端

`server/repositories/reviewsRepo.js`：移除 `countByUser`，新增 `listByUser(uid)`：

```js
async listByUser(uid) {
  const snap = await firestore.collectionGroup('entries').where('uid', '==', uid).get()
  return snap.docs.map(doc => ({
    spotId: doc.ref.parent.parent.id,
    rating: doc.data().rating,
  }))
}
```

因為「一使用者一景點只有一筆評論」已在寫入端（見上一節）強制保證，這裡不需要用 `Map` 去重、也不用比對 `createdAt`，一個 `spotId` 對應剛好一筆評論。

同一個 repo 裡的 `add(spotId, {uid, ...})` 也要改：新增前先查詢是否已有該 uid 的評論，有的話回傳 `{error: 'duplicate'}`：

```js
async add(spotId, {uid, authorName, rating, content}) {
  const collection = firestore.collection('reviews').doc(spotId).collection('entries')
  const existing = await collection.where('uid', '==', uid).limit(1).get()
  if (!existing.empty) return {error: 'duplicate'}

  const ref = collection.doc()
  const data = {
    uid, authorName, rating, content,
    isSeed: false,
    createdAt: new Date().toISOString(),
    updatedAt: null,
  }
  await ref.set(data)
  return {id: ref.id, ...data}
}
```

`server/app.js` 的 `POST /api/reviews/:spotId` 也要跟著改，收到 `result.error === 'duplicate'` 時回 409（跟現有 `patch`/`delete` 路由檢查 `result.error === 'not_found'`/`'forbidden'` 的寫法一致）。

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

`src/page/viewPoint.vue`（配合上面「一景點一評論」的寫入限制）：

- 新增 `computed` 判斷目前登入者是否已對這個景點留過評論：`const myReview = computed(() => reviewStore.reviews.find(r => r.uid === authStore.user?.uid))`。
- `myReview` 存在時隱藏「新增評論」表單（`newReviewRating`/`newReviewContent` 那一塊），畫面上只留現有評論列表（本來就有的、`authStore.user?.uid === review.uid` 才顯示的編輯/刪除按鈕，見 [viewPoint.vue:317](src/page/viewPoint.vue#L317)）。
- `reviewStore.addReview` 收到 409（`error.response?.status === 409`）時跳出「你已經評論過這個景點了」，而不是目前一律顯示的「送出評論失敗，請稍後再試」。正常操作流程下（表單已隱藏）不會走到這裡，這只涵蓋雙分頁/雙擊等競態情況。

## 錯誤處理

- `GET /api/reviews/mine` 沿用 [server/app.js](server/app.js) 既有的 `asyncHandler` + 全域錯誤 middleware，查詢失敗回 500，不會讓 process crash。
- 前端 `fetchReviewedSpots` 失敗僅 log 錯誤，畫面上維持空清單狀態（不擋整頁），跟現有 `fetchReviews`/`fetchFavorites` 的錯誤處理風格一致。
- `POST /api/reviews/:spotId` 重複送出回 409，前端顯示對應提示（見上）。

## 測試計畫

- 後端：`server/app.test.js`
  - 移除 `/api/reviews/mine/count` 的測試，新增 `/api/reviews/mine` 測試：
    - 未帶 token → 401
    - 回傳跨景點清單（每個 spotId 剛好一筆）
    - 評論對應的景點在 `allViewPoint` 裡找不到時被濾掉
  - `POST /api/reviews/:spotId` 新增測試：同一 uid 對同一 spotId 重複送出 → 第二次回 409
  - `reviewsRepo.add` 補單元測試：已存在該 uid 的評論時回傳 `{error: 'duplicate'}`，且不會呼叫 `set`
- 前端：手動在瀏覽器裡確認：
  - 「我評論過的景點」區塊在有/無評論兩種狀態下正確顯示，點擊卡片正確導到景點頁
  - 護照卡片的「撰寫評論」數字與清單筆數一致
  - 已評論過的景點頁不再顯示「新增評論」表單，只看得到自己那則的編輯/刪除

## 待確認事項（已在對話中拍板，此處僅記錄）

- 顯示位置：`MyJourneyView.vue` 內新增區塊（非獨立頁面）。
- 每個項目顯示內容：圖片＋景點名稱，點擊連到景點頁（不在清單上直接顯示評論內容）。
- 合併 `/api/reviews/mine/count` 與清單端點為單一 `/api/reviews/mine`，避免重複查詢。
- 景點名稱/圖片採讀取時 join，不在評論文件寫入時做快照。
- 「一使用者一景點一評論」在寫入端（`POST /api/reviews/:spotId`）強制檢查並回 409，前端隱藏重複的新增表單；`listByUser` 不再做防禦性去重。
