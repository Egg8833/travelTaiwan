# 評論過的景點清單 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在「我的旅程」頁新增一個區塊，列出使用者評論過的所有景點，並讓「同一使用者對同一景點只能有一筆評論」成為伺服器端真正強制的規則（不再只是假設）。

**Architecture:** 後端在 `reviewsRepo.add` 寫入前檢查重複、路由回 409；`countByUser` 換成 `listByUser`，合併進單一 `GET /api/reviews/mine`，跟記憶體裡的 `allViewPoint` join 出景點名稱/圖片。前端 `reviewStore` 用清單長度算出評論數（移除獨立的 count API），`MyJourneyView.vue` 新增區塊沿用現有「我的收藏」的 `card` 元件寫法，`viewPoint.vue` 依是否已評論隱藏新增表單。

**Tech Stack:** Express + firebase-admin（Firestore）／Vue 3 `<script setup>` + Pinia，後端測試用 Node 內建 `node:test`。

## Global Constraints

- 後端所有 async 路由必須包在 `server/app.js:19` 定義的 `asyncHandler` 裡（現有慣例，本次新路由沿用）。
- 錯誤用 result-object（`{error: 'xxx'}`）回傳，不用 throw（沿用 `update`/`remove` 現有寫法）。
- 依 spec [docs/superpowers/specs/2026-07-16-reviewed-spots-list-design.md](../specs/2026-07-16-reviewed-spots-list-design.md)：移除 `/api/reviews/mine/count`，改為 `/api/reviews/mine` 回傳清單；`myReviewCount` 前端改用 `computed`。
- 每個 task 完成後執行對應測試指令確認通過，再進到下一個 task。

---

### Task 1: 後端 — 寫入時強制一景點一評論

**Files:**
- Modify: `server/repositories/reviewsRepo.js:17-30`（`add` 方法）
- Modify: `server/app.js:89-102`（`POST /api/reviews/:spotId` 路由）
- Modify: `server/app.test.js:37-43`（`fakeReviewsRepo.add`）、新增測試

**Interfaces:**
- Produces: `reviewsRepo.add(spotId, {uid, authorName, rating, content})` 若該 uid 已對該 spotId 有評論，回傳 `{error: 'duplicate'}`；否則回傳同現有格式 `{id, uid, authorName, rating, content, isSeed, createdAt, updatedAt}`。

- [ ] **Step 1: 寫失敗測試 — 重複送出評論回 409**

在 `server/app.test.js` 的 `新增 → 編輯 → 刪除自己的評論` 測試（約第 238 行）之後插入新測試：

```js
test('對同一景點重複送出評論回 409', async () => {
  const authHeaders = {Authorization: 'Bearer valid-token', 'Content-Type': 'application/json'}

  const firstRes = await fetch(base + '/api/reviews/spot-dup', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({rating: 4, content: '第一次評論'}),
  })
  assert.equal(firstRes.status, 201)

  const secondRes = await fetch(base + '/api/reviews/spot-dup', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({rating: 5, content: '第二次評論'}),
  })
  assert.equal(secondRes.status, 409)
  const body = await secondRes.json()
  assert.ok(body.message)
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `cd server && npm test`
Expected: 新測試 FAIL，因為 `secondRes.status` 會是 201（目前允許重複新增），不是 409。

- [ ] **Step 3: `fakeReviewsRepo.add` 加上重複檢查**

修改 `server/app.test.js:37-43`：

```js
  async add(spotId, {uid, authorName, rating, content}) {
    if (!reviewsStore.has(spotId)) reviewsStore.set(spotId, new Map())
    const spotEntries = reviewsStore.get(spotId)
    const existing = [...spotEntries.values()].find(e => e.uid === uid)
    if (existing) return {error: 'duplicate'}
    const id = String(nextReviewId++)
    const data = {id, uid, authorName, rating, content, isSeed: false, createdAt: new Date().toISOString(), updatedAt: null}
    spotEntries.set(id, data)
    return data
  },
```

- [ ] **Step 4: `server/app.js` 的 POST 路由檢查 `duplicate` 錯誤**

修改 `server/app.js:89-102`：

```js
  app.post('/api/reviews/:spotId', verifyToken, asyncHandler(async (req, res) => {
    const {rating, content, authorName} = req.body
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({message: 'rating must be between 1 and 5'})
    }
    if (!content) return res.status(400).json({message: 'content is required'})
    const review = await reviewsRepo.add(req.params.spotId, {
      uid: req.uid,
      authorName: authorName || req.firebaseUser.name || '匿名旅人',
      rating,
      content,
    })
    if (review.error === 'duplicate') return res.status(409).json({message: '你已經評論過這個景點了'})
    res.status(201).json(review)
  }))
```

- [ ] **Step 5: 執行測試確認通過**

Run: `cd server && npm test`
Expected: 全部測試 PASS（含新增的重複送出測試）。

- [ ] **Step 6: 真正的 `reviewsRepo.js` 也加上一樣的檢查（讓 production 邏輯跟 fake 一致）**

修改 `server/repositories/reviewsRepo.js:17-30`：

```js
  async add(spotId, {uid, authorName, rating, content}) {
    const collection = firestore.collection('reviews').doc(spotId).collection('entries')
    const existing = await collection.where('uid', '==', uid).limit(1).get()
    if (!existing.empty) return {error: 'duplicate'}

    const ref = collection.doc()
    const data = {
      uid,
      authorName,
      rating,
      content,
      isSeed: false,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    }
    await ref.set(data)
    return {id: ref.id, ...data}
  },
```

- [ ] **Step 7: `server/openapi.js` 補上 409 回應**

修改 `server/openapi.js:352-357`（POST `/api/reviews/{spotId}` 的 `responses`），在 `400` 後面加：

```js
          409: {description: '已對此景點留過評論', content: {'application/json': {schema: {$ref: '#/components/schemas/Error'}}}},
```

- [ ] **Step 8: 執行全部測試確認 OpenAPI 相關測試仍通過**

Run: `cd server && npm test`
Expected: 全部 PASS（含 `GET /api/openapi.json 回傳 OpenAPI spec`，因為只改了既有 path 底下的 responses，path 數量不變）。

- [ ] **Step 9: Commit**

```bash
git add server/repositories/reviewsRepo.js server/app.js server/app.test.js server/openapi.js
git commit -m "feat(reviews): reject duplicate review for the same spot with 409"
```

---

### Task 2: 後端 — 合併 `/mine/count` 為 `/mine`，回傳評論過的景點清單

**Files:**
- Modify: `server/repositories/reviewsRepo.js:12-15`（移除 `countByUser`，新增 `listByUser`）
- Modify: `server/app.js:104-106`（移除 `/mine/count` 路由，新增 `/mine` 路由）
- Modify: `server/openapi.js:359-376`（`/api/reviews/mine/count` → `/api/reviews/mine`）
- Modify: `server/app.test.js`：`fakeReviewsRepo`（第 60-68 行 `countByUser`）、`/mine/count` 測試（約第 279-301 行）

**Interfaces:**
- Consumes: Task 1 完成後的 `reviewsRepo.add`（已擋重複）
- Produces: `reviewsRepo.listByUser(uid)` → `Promise<Array<{spotId: string, rating: number}>>`；`GET /api/reviews/mine`（需登入）→ `200` 回傳 `Array<{spotId, spotName, pictureUrl, rating}>`

- [ ] **Step 1: 寫失敗測試 — `GET /api/reviews/mine`**

把 `server/app.test.js` 裡第 279-301 行的兩個 `/api/reviews/mine/count` 測試整段換成：

```js
test('GET /api/reviews/mine 未帶 token 回 401', async () => {
  const res = await fetch(base + '/api/reviews/mine')
  assert.equal(res.status, 401)
})

test('GET /api/reviews/mine 回傳跨景點的評論清單', async () => {
  const authHeaders = {Authorization: 'Bearer valid-token', 'Content-Type': 'application/json'}
  await fetch(base + '/api/reviews/spot-10', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({rating: 5, content: '很喜歡這裡'}),
  })
  await fetch(base + '/api/reviews/spot-11', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({rating: 3, content: '普通'}),
  })

  const res = await fetch(base + '/api/reviews/mine', {headers: {Authorization: 'Bearer valid-token'}})
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.length, 2)
  assert.ok(body.every(s => typeof s.spotId === 'string' && typeof s.rating === 'number'))
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `cd server && npm test`
Expected: 新測試 FAIL（`/api/reviews/mine` 目前是 404，因為路由還不存在）。

- [ ] **Step 3: `fakeReviewsRepo` 把 `countByUser` 換成 `listByUser`**

修改 `server/app.test.js:60-68`（原 `countByUser` 方法）：

```js
  async listByUser(uid) {
    const result = []
    for (const [spotId, entries] of reviewsStore.entries()) {
      for (const entry of entries.values()) {
        if (entry.uid === uid) result.push({spotId, rating: entry.rating})
      }
    }
    return result
  },
```

- [ ] **Step 4: 真正的 `reviewsRepo.js` 把 `countByUser` 換成 `listByUser`**

修改 `server/repositories/reviewsRepo.js:12-15`：

```js
  async listByUser(uid) {
    const snap = await firestore.collectionGroup('entries').where('uid', '==', uid).get()
    return snap.docs.map(doc => ({
      spotId: doc.ref.parent.parent.id,
      rating: doc.data().rating,
    }))
  },
```

- [ ] **Step 5: `server/app.js` 把 `/mine/count` 路由換成 `/mine`**

修改 `server/app.js:104-106`：

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

- [ ] **Step 6: 執行測試確認通過**

Run: `cd server && npm test`
Expected: 全部 PASS。

- [ ] **Step 7: `server/openapi.js` 換掉 `/api/reviews/mine/count` 定義**

修改 `server/openapi.js:359-376`，整段換成：

```js
    '/api/reviews/mine': {
      get: {
        tags: ['Review'],
        summary: '取得目前使用者評論過的景點清單（跨所有景點）',
        security: [{bearerAuth: []}],
        responses: {
          200: {
            description: '評論過的景點清單',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      spotId: {type: 'string'},
                      spotName: {type: 'string'},
                      pictureUrl: {type: 'string', nullable: true},
                      rating: {type: 'integer', example: 4},
                    },
                  },
                },
              },
            },
          },
          401: {description: '未登入或 Token 無效', content: {'application/json': {schema: {$ref: '#/components/schemas/Error'}}}},
        },
      },
    },
```

- [ ] **Step 8: 執行全部測試確認通過**

Run: `cd server && npm test`
Expected: 全部 PASS，包含 `GET /api/openapi.json 回傳 OpenAPI spec`（path 數量不變，只是換了 key 名稱）。

- [ ] **Step 9: Commit**

```bash
git add server/repositories/reviewsRepo.js server/app.js server/app.test.js server/openapi.js
git commit -m "feat(reviews): replace /reviews/mine/count with /reviews/mine listing reviewed spots"
```

---

### Task 3: 前端 API client — `getMyReviewedSpotsApi`

**Files:**
- Modify: `src/api/index.js:55-56`

**Interfaces:**
- Consumes: `GET /api/reviews/mine`（Task 2）
- Produces: `getMyReviewedSpotsApi(): Promise<Array<{spotId, spotName, pictureUrl, rating}>>`

- [ ] **Step 1: 替換 `getMyReviewCountApi`**

修改 `src/api/index.js:55-56`，把：

```js
export const getMyReviewCountApi = () =>
  api.get('/reviews/mine/count').then(res => res.data.count)
```

換成：

```js
export const getMyReviewedSpotsApi = () =>
  api.get('/reviews/mine').then(res => res.data)
```

- [ ] **Step 2: 確認沒有其他地方還 import 舊的 `getMyReviewCountApi`**

Run: `grep -rn "getMyReviewCountApi" src/`
Expected: 沒有任何結果（下一個 task 會處理 `reviewStore.js` 裡的引用，這裡先確認 grep 指令能用）。

- [ ] **Step 3: Commit**

```bash
git add src/api/index.js
git commit -m "feat(api): replace getMyReviewCountApi with getMyReviewedSpotsApi"
```

---

### Task 4: 前端 Store — `reviewedSpots` state + `myReviewCount` computed

**Files:**
- Modify: `src/store/reviewStore.js`（全檔案，見下方完整內容）

**Interfaces:**
- Consumes: `getMyReviewedSpotsApi`（Task 3）
- Produces: `useReviewStore()` 回傳 `{reviews, reviewedSpots, myReviewCount, fetchReviews, fetchReviewedSpots, addReview, updateReview, deleteReview}`；`addReview` 遇到 409 時回傳 `false` 並顯示「你已經評論過這個景點了」而不是通用錯誤訊息。

- [ ] **Step 1: 改寫 `src/store/reviewStore.js`**

整檔換成：

```js
import {defineStore} from 'pinia'
import {ref, computed} from 'vue'
import {
  getReviewsApi,
  addReviewApi,
  updateReviewApi,
  deleteReviewApi,
  getMyReviewedSpotsApi,
} from '@/api/index.js'

export const useReviewStore = defineStore('review', () => {
  const reviews = ref([])
  const reviewedSpots = ref([])
  const myReviewCount = computed(() => reviewedSpots.value.length)

  const fetchReviews = async spotId => {
    try {
      reviews.value = await getReviewsApi(spotId)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchReviewedSpots = async () => {
    try {
      reviewedSpots.value = await getMyReviewedSpotsApi()
    } catch (e) {
      console.error(e)
    }
  }

  const addReview = async (spotId, {rating, content, authorName}) => {
    try {
      const created = await addReviewApi(spotId, {rating, content, authorName})
      reviews.value = [created, ...reviews.value]
      return true
    } catch (e) {
      console.error(e)
      if (e.response?.status === 409) {
        alert('你已經評論過這個景點了')
      } else {
        alert('送出評論失敗，請稍後再試')
      }
      return false
    }
  }

  const updateReview = async (spotId, reviewId, {rating, content}) => {
    try {
      const updated = await updateReviewApi(spotId, reviewId, {rating, content})
      reviews.value = reviews.value.map(r => (r.id === reviewId ? updated : r))
      return true
    } catch (e) {
      console.error(e)
      alert('更新評論失敗，請稍後再試')
      return false
    }
  }

  const deleteReview = async (spotId, reviewId) => {
    try {
      await deleteReviewApi(spotId, reviewId)
      reviews.value = reviews.value.filter(r => r.id !== reviewId)
      return true
    } catch (e) {
      console.error(e)
      alert('刪除評論失敗，請稍後再試')
      return false
    }
  }

  return {
    reviews,
    reviewedSpots,
    myReviewCount,
    fetchReviews,
    fetchReviewedSpots,
    addReview,
    updateReview,
    deleteReview,
  }
})
```

- [ ] **Step 2: 手動驗證 store 沒有語法錯誤**

Run: `cd /c/Users/user/Desktop/travelTaiwan && npx vite build 2>&1 | tail -30`
Expected: build 成功（沒有跟 `reviewStore.js` 相關的錯誤；此時 `MyJourneyView.vue`/`viewPoint.vue` 還沒改，仍會呼叫 `fetchMyReviewCount`，下一步會處理）。

- [ ] **Step 3: Commit**

```bash
git add src/store/reviewStore.js
git commit -m "feat(store): derive myReviewCount from reviewedSpots list, handle 409 on addReview"
```

---

### Task 5: 前端 — `viewPoint.vue` 已評論過的景點隱藏新增表單

**Files:**
- Modify: `src/page/viewPoint.vue:259-276`（新增表單區塊）、新增 `computed`

**Interfaces:**
- Consumes: `reviewStore.reviews`（既有）、`authStore.user`（既有）

- [ ] **Step 1: 在 `<script setup>` 加上 `myReview` computed**

在 `src/page/viewPoint.vue` 的 `averageRating` computed（第 66-70 行）之後加入：

```js
const myReview = computed(() =>
  reviewStore.reviews.find(r => r.uid === authStore.user?.uid)
);
```

- [ ] **Step 2: 模板裡讓新增表單只在「已登入且尚未評論過」時顯示**

把 `src/page/viewPoint.vue:259-276` 的：

```html
        <div class="pt-2 pb-6 border-b border-b-solid border-[#eee]">
          <div v-if="authStore.user">
            <p class="font-700 text-[#434343] mb-2">留下你的評論</p>
            <StarRatingInput v-model="newReviewRating" />
            <textarea
              v-model="newReviewContent"
              rows="3"
              class="w-full mt-2 rounded-[8px] border-1 border-solid border-[#eee] py-2 px-4"
              placeholder="分享你的旅遊心得..."
            ></textarea>
            <button class="btn mt-2" @click="submitReview">送出評論</button>
          </div>
          <div v-else>
            <router-link :to="{ name: 'login' }" class="text-[#1FB588] underline">
              登入後即可留言
            </router-link>
          </div>
        </div>
```

換成：

```html
        <div class="pt-2 pb-6 border-b border-b-solid border-[#eee]">
          <div v-if="authStore.user && !myReview">
            <p class="font-700 text-[#434343] mb-2">留下你的評論</p>
            <StarRatingInput v-model="newReviewRating" />
            <textarea
              v-model="newReviewContent"
              rows="3"
              class="w-full mt-2 rounded-[8px] border-1 border-solid border-[#eee] py-2 px-4"
              placeholder="分享你的旅遊心得..."
            ></textarea>
            <button class="btn mt-2" @click="submitReview">送出評論</button>
          </div>
          <div v-else-if="authStore.user && myReview" class="text-[#808080]">
            你已經評論過這個景點了，可以在下方編輯或刪除你的評論。
          </div>
          <div v-else>
            <router-link :to="{ name: 'login' }" class="text-[#1FB588] underline">
              登入後即可留言
            </router-link>
          </div>
        </div>
```

- [ ] **Step 3: 手動驗證**

Run: `npm run dev`（若尚未啟動）並在瀏覽器打開任一景點頁：
1. 未登入 → 看到「登入後即可留言」
2. 已登入且未評論過 → 看到「留下你的評論」表單
3. 送出一則評論後 → 表單消失，改顯示「你已經評論過這個景點了」提示，下方自己的評論卡片可以編輯/刪除

Expected: 三種狀態都如上所述。

- [ ] **Step 4: Commit**

```bash
git add src/page/viewPoint.vue
git commit -m "feat(viewPoint): hide new-review form once user already reviewed the spot"
```

---

### Task 6: 前端 — `MyJourneyView.vue` 新增「我評論過的景點」區塊

**Files:**
- Modify: `src/views/MyJourneyView.vue`

**Interfaces:**
- Consumes: `reviewStore.reviewedSpots`（Task 4）、既有 `card` 元件（`props: {cardData}`，見 `src/components/card.vue:11-15`）

- [ ] **Step 1: `onMounted` 換成呼叫 `fetchReviewedSpots`**

把 `src/views/MyJourneyView.vue:36-40` 的：

```js
onMounted(async () => {
  reviewStore.fetchMyReviewCount();
  await favoriteStore.fetchFavorites();
  loadRatings(favoriteStore.favoriteList);
});
```

換成：

```js
onMounted(async () => {
  reviewStore.fetchReviewedSpots();
  await favoriteStore.fetchFavorites();
  loadRatings(favoriteStore.favoriteList);
});
```

- [ ] **Step 2: 加上 `toReviewCardData` 轉換函式**

在 `src/views/MyJourneyView.vue` 的 `toCardData` 函式（第 49-61 行）之後加入：

```js
const toReviewCardData = (spot) => {
  const photoSrc = [spot.pictureUrl].filter(Boolean);
  if (photoSrc.length === 0) {
    photoSrc.push(noImage);
  }
  return {
    id: spot.spotId,
    title: spot.spotName,
    photoSrc,
    tagText: [],
    startNum: spot.rating,
  };
};
```

- [ ] **Step 3: 模板裡新增「我評論過的景點」區塊**

在 `src/views/MyJourneyView.vue` 現有「我的收藏」`<section>`（第 122-156 行）結束的 `</section>` 之後、`</div>`（第 157 行）之前，加入：

```html
    <section class="mt-10">
      <h2 class="text-[20px] font-700 text-[#434343] mb-4 flex items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="shrink-0">
          <path
            d="M4 4h16v12H7l-3 3V4Z"
            fill="#1FB588"
          />
        </svg>
        我評論過的景點
      </h2>

      <div
        v-if="reviewStore.reviewedSpots.length === 0"
        class="empty-state rounded-[16px] border-1 border-dashed border-[#c9e9de] bg-[#F3FBF8] py-14 px-6 text-center"
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" class="mx-auto mb-3">
          <circle cx="12" cy="12" r="9" stroke="#28DAA5" stroke-width="1.6" />
          <path d="m14.5 9.5-2 5.5-2.5-3 5.5-2Z" fill="#28DAA5" />
        </svg>
        <p class="text-[#808080] mb-4">還沒有留下任何評論，去景點頁分享你的旅行故事吧！</p>
        <router-link :to="{ name: 'viewList' }" class="btn inline-block">
          去找景點
        </router-link>
      </div>

      <div v-else class="flex flex-wrap gap-4">
        <router-link
          v-for="spot in reviewStore.reviewedSpots"
          :key="spot.spotId"
          :to="`/viewList/${spot.spotId}`"
        >
          <card :cardData="toReviewCardData(spot)"></card>
        </router-link>
      </div>
    </section>
```

- [ ] **Step 4: 手動驗證**

Run: `npm run dev`（若尚未啟動）並在瀏覽器打開「我的旅程」頁：
1. 尚未評論任何景點時 → 看到空狀態文案跟「去找景點」按鈕
2. 到任一景點頁留言後回到「我的旅程」 → 「我評論過的景點」區塊出現該景點卡片，圖片/名稱/星等正確，護照卡片的「撰寫評論」數字跟卡片數量一致
3. 點擊卡片 → 正確導到該景點頁

Expected: 三項都如上所述。

- [ ] **Step 5: Commit**

```bash
git add src/views/MyJourneyView.vue
git commit -m "feat(myJourney): add reviewed-spots section"
```

---

## Self-Review Notes

- **Spec coverage**：spec 的四個決策（合併 count/list 端點、讀取時 join、寫入時擋重複、`listByUser` 不再去重）分別對應 Task 1（擋重複）、Task 2（合併端點 + join）；前端四個檔案異動（api/store/viewPoint/MyJourneyView）對應 Task 3-6。openapi 更新包含在 Task 1 Step 7 與 Task 2 Step 7。測試計畫裡列的所有案例（401、清單內容、景點找不到被濾掉、重複送出 409）都在 Task 1-2 的測試步驟裡。
- **型別一致性**：`listByUser` 回傳 `{spotId, rating}`，`GET /api/reviews/mine` 回傳的物件用 `spotId/spotName/pictureUrl/rating`，前端 `getMyReviewedSpotsApi`、`reviewStore.reviewedSpots`、`toReviewCardData` 全部使用同一組欄位名稱，沒有不一致。
- 「評論對應的景點在 `allViewPoint` 裡找不到時被濾掉」這條沒有獨立寫成後端測試（因為需要在測試資料集裡製造一個不存在於 `allViewPoint.json` 的 spotId，而目前測試都用 fake repo、不讀真正的 `allViewPoint.json`），改為由 Task 2 Step 5 的 `.filter(Boolean)` 程式碼保證行為存在；如果之後要補這條的自動化測試，需要另外注入假的 `allViewPoint` 資料到 `createApp`，目前不在此計畫範圍內。
