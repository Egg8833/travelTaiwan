# travelTaiwan：新增會員登入、景點收藏、景點評論

日期：2026-07-09
狀態：已核准設計

## 背景

- 目前 `src/` 完全沒有身份驗證，也沒有資料庫（後端只讀 `server/data/*.json`）。
- Header 上「我的旅程」是死連結（`src/components/Header.vue:108-115`，`<a href="#">`，無 route、無功能）。
- `card.vue` 上的愛心圖示（`heart-outline.svg`）是純裝飾，未綁定任何互動或狀態（`src/components/card.vue:34-39`）。
- 景點明細頁（`src/page/viewPoint.vue`）目前沒有評論功能。

## 目標

1. 新增會員系統：Email/密碼註冊登入 + Google OAuth（Popup 方式），使用 Firebase Authentication。
2. 「我的旅程」改為登入入口／個人中心：顯示基本資訊（頭像、Email、登出）+ 收藏清單。
3. 景點卡片愛心圖示改為可互動的收藏功能，未登入時導去登入頁。
4. 景點明細頁新增評論功能（文字 + 1~5 星評分），登入才可發表，可編輯/刪除自己的評論。
5. 為現有熱門景點原創撰寫模擬評論作為種子資料，驗證評論功能有內容可看。

## 非目標

- 行程規劃（建立/編輯多個旅遊行程、排序景點、排日期）：本次「我的旅程」只做登入入口 + 收藏清單，不做行程建立。列入下方「未來規劃」。
- 收藏本地端（未登入）暫存：未登入一律導去登入頁，不做 localStorage 暫存收藏。
- 前端自動化測試框架導入：本次沿用現有手動驗證方式，不引入 Vitest。
- 評論檢舉/審核機制：本次不做內容審核後台。
- 種子評論之外的大量景點鋪資料：本次只涵蓋首頁熱門/各城市代表性景點，約十幾個。

## 架構

- **身份驗證**：Firebase Authentication（Email/密碼 + Google OAuth）。前端用 Firebase JS SDK 處理登入 UI 與流程，密碼不經過自建後端。
- **資料儲存**：Firestore，只存使用者相關的私有資料（收藏、評論）。景點本身資料維持在 `server/data/*.json`，不搬遷。
- **後端整合**：現有 Express 後端（`server/app.js`）新增受保護 API，前端登入後取得 Firebase ID Token，以 `Authorization: Bearer <token>` 呼叫；後端用 `verifyFirebaseToken` middleware（Firebase Admin SDK）驗證後取出 `req.uid`，再讀寫 Firestore。
- Firestore 另設 Security Rules 作第二道防線（`request.auth.uid` 比對），防止繞過後端直接讀寫他人資料。

```
前端(Firebase SDK 登入) → 取得 ID Token
前端 → Express API (帶 Token) → Admin SDK 驗證 → Firestore 讀寫
```

## 資料模型（Firestore）

```
favorites/{uid}/spots/{spotId}
  - spotId: string
  - spotName: string        // 快取，列表頁不用反查景點 API
  - pictureUrl: string      // 快取
  - addedAt: timestamp

reviews/{spotId}/entries/{reviewId}
  - uid: string | null      // null 表示種子資料
  - authorName: string      // 真實使用者：Firebase displayName；種子資料：虛擬旅人暱稱
  - rating: number           // 1~5
  - content: string
  - isSeed: boolean
  - createdAt: timestamp
  - updatedAt: timestamp | null
```

- 使用者基本資料（Email、頭像、UID）直接取自 Firebase Auth 使用者物件，不另建 Firestore user collection。
- 評論平均分數不另存欄位，前端拿到評論列表後即時計算（種子階段每景點僅 3~5 則，成本可忽略）。

## API 端點（新增，掛在現有 Express + Swagger/OpenAPI 文件）

| Method | Path | 說明 | 驗證 |
|---|---|---|---|
| GET | `/api/auth/me` | 回傳目前登入者基本資訊（uid/email/displayName） | 需要 |
| GET | `/api/favorites` | 取得目前使用者的收藏清單 | 需要 |
| POST | `/api/favorites/:spotId` | 新增收藏（body 含 spotName、pictureUrl 供快取） | 需要 |
| DELETE | `/api/favorites/:spotId` | 取消收藏 | 需要 |
| GET | `/api/reviews/:spotId` | 取得該景點評論列表 | 不需要（公開閱讀） |
| POST | `/api/reviews/:spotId` | 新增評論（body: rating, content） | 需要 |
| PATCH | `/api/reviews/:spotId/:reviewId` | 編輯自己的評論 | 需要，後端比對 `uid` |
| DELETE | `/api/reviews/:spotId/:reviewId` | 刪除自己的評論 | 需要，後端比對 `uid` |

- 沒有登入/註冊/登出 API：這些都是前端直接呼叫 Firebase SDK 完成，後端不經手密碼。
- 錯誤回應沿用現有 `Error` schema（`server/openapi.js`），401/404/500 皆用同一結構。
- 上述端點皆補進現有 Swagger UI（`/api-docs`）。

## 前端改動

現況：路由（`src/router/index.js`）無 guard/meta；Pinia store 為 Composition API 風格（`ref` + 函式，見 `viewStore.js`、`homeViewStore.js`）；API 呼叫集中於單一 axios instance（`src/api/index.js`）；頁面分散於 `src/views`（列表類）與 `src/page`（明細類）。

**新增路由**（放 `src/views`，沿用現有慣例）：

```
/login          → views/LoginView.vue          Email 登入/註冊 + Google 登入按鈕
/my-journey     → views/MyJourneyView.vue       meta: { requiresAuth: true }
```

`router/index.js` 新增 `router.beforeEach`：檢查 `to.meta.requiresAuth`，未登入導去 `/login`（帶 `redirect` query 供登入後導回）。

**新增 Pinia store**：

- `src/store/authStore.js`：state `user`、`isAuthReady`；actions `loginWithEmail`、`registerWithEmail`、`loginWithGoogle`（`signInWithPopup`）、`logout`；建立時掛 `onAuthStateChanged` 同步 `user`。
- `src/store/favoriteStore.js`：state `favoriteIds`（Set）、`favoriteList`；actions `fetchFavorites`、`toggleFavorite(spot)`（樂觀更新，失敗還原並 `alert()`，比照 `homeViewStore` 既有錯誤處理手法）。
- `src/store/reviewStore.js`：actions `fetchReviews(spotId)`、`addReview`、`updateReview`、`deleteReview`；只有 `authStore.user.uid === review.uid` 時才顯示編輯/刪除按鈕。

**API 層**：`src/api/index.js` 新增 `getFavoritesApi`、`addFavoriteApi`、`removeFavoriteApi`、`getReviewsApi`、`addReviewApi`、`updateReviewApi`、`deleteReviewApi`；新增 axios request interceptor，若 `authStore.user` 存在自動帶入 `Authorization: Bearer <idToken>`（沿用同一 axios instance）；response interceptor 攔截 401，清除 `authStore.user` 並導去 `/login`。

**元件變更**：

- `Header.vue`：「我的旅程」由死連結改為 `router-link`，依 `authStore.user` 是否存在決定導向 `/login` 或 `/my-journey`，樣式沿用現有 pill 樣式。
- `card.vue`：愛心圖示依 `favoriteStore.favoriteIds.has(cardData.id)` 動態切換 `heart-outline.svg` / 新增的 `heart-filled.svg`，加 `@click` 呼叫 `toggleFavorite`；未登入時導去 `/login`。
- `viewPoint.vue`：新增評論區塊 — 星級評分元件 + 文字輸入框（登入才顯示表單，未登入顯示提示並連到 `/login`）、評論列表（暱稱、星等、內容、時間）、平均評分顯示於標題附近。

## 錯誤處理

- Firebase Auth 錯誤（帳號已存在、密碼錯誤、Google 登入取消等）：`authStore` action 內 try/catch，轉中文訊息後 `alert()`（比照現有模式，不引入新 UI 套件）。
- API 401（Token 過期/無效）：axios response interceptor 攔截，清除本地登入狀態並導去 `/login`。
- 收藏/評論操作失敗：樂觀更新失敗時還原狀態並 alert 提示，不阻斷頁面其他功能。
- 後端：`verifyFirebaseToken` 驗證失敗回 401 + 現有 `Error` schema；Firestore 寫入失敗回 500 + 同結構。

## 測試

- 後端：延續 `server/app.test.js`（Node 內建 test runner）風格，新增 `verifyFirebaseToken` middleware 單元測試（mock Admin SDK 驗證成功/失敗）與 `/api/favorites`、`/api/reviews` 系列端點整合測試（mock Firestore）。
- 前端：不引入新測試框架，手動驗證：登入/註冊/Google 登入/收藏/取消收藏/未登入導轉/發表評論/編輯評論/刪除評論/未登入看評論。

## 種子評論資料

- 由開發者原創撰寫（不拷貝任何平台的具體文字），參考一般旅遊評論常見話題與風格，為首頁熱門或各城市代表性景點（約十幾個）各寫 3~5 則風格自然的模擬評論。
- 作者顯示為虛擬旅人暱稱（如「旅人A」「阿先」），`isSeed: true`。
- 透過一次性 seed script 寫入 Firestore，不做成正式 API，避免誤觸發重複匯入。

## 未來規劃（本次不做，列為後續參考）

- **P1**：真正的行程規劃（建立多個行程、加入收藏景點、排序、標註日期），資料模型可沿用 `favorites` 的 subcollection 設計（`itineraries/{uid}/trips/{tripId}`）。
- **P2**：找景點頁地圖檢視模式；依地理位置推薦附近景點。
- **P3**：行程分享連結（免登入瀏覽）；景點資料後台管理介面（取代手動維護 JSON）。
