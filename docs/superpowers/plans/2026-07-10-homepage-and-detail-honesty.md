# 首頁真實資料串接與景點詳情頁聯絡資訊誠實化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 首頁「熱門打卡景點」改用真實 API 資料取代寫死陣列；景點詳情頁移除虛構的「服務設施」清單，改用資料集裡真實存在的電話／官網／停車資訊欄位組成「聯絡資訊」區塊，並修好頂部電話／網址按鈕的連結行為。

**Architecture:** 純前端 Vue 3 (Composition API) 改動，不動 `server/`。`homeViewStore` 既有的 `randomThreeItems`（`getRandomViewApi(3)` 結果）直接餵給首頁的 `HotCheckInPoint` 元件；`processList.js` 的資料轉換函式補上 `websiteUrl`、`hasParking` 兩個欄位；`viewPoint.vue` 用這些欄位重寫聯絡資訊 UI。

**Tech Stack:** Vue 3 (`<script setup>`), Pinia, Vite dev server（`vite.config.js` 已設定 `/api` proxy 到 `localhost:3000`）。

## Global Constraints

- 不新增前端測試框架；本專案目前無任何 `*.test.js`/`*.spec.js`，驗證一律用手動跑 dev server + 瀏覽器檢查（對照 spec「測試 / 驗證方式」章節）。
- 不改 `server/` 任何檔案、不改資料結構。
- `processViewData`（`src/common/processList.js`）的既有欄位（`city/id/title/phone/openTime/tagText/startNum/photoSrc/description/ZipCode/Address`）維持不變，只新增欄位，不可移除或重新命名既有欄位。
- 兩個景點測試 ID：`VCA_379000000A_000032`（台北當代藝術館，有 Phone/WebsiteUrl，`ParkingPosition: {}`）與 `VCA_371030000A_000046`（福正沙灘，無 Phone、無 WebsiteUrl、無 Picture、`ParkingPosition: {}`）。

---

### Task 1: `processList.js` 補上 `websiteUrl` 與 `hasParking` 欄位

**Files:**
- Modify: `src/common/processList.js:18-30`

**Interfaces:**
- Produces: `processViewData(dataList)` 回傳的每個物件新增兩個欄位：`websiteUrl: string | null`、`hasParking: boolean`。這兩個欄位供 Task 3（`viewPoint.vue`）使用。

- [ ] **Step 1: 修改 `processViewData` 回傳物件**

把 `src/common/processList.js` 的回傳物件（第 18–30 行）從：

```js
    return {
      city: e.City,
      id: e.ScenicSpotID,
      title: e.ScenicSpotName,
      phone: e.Phone,
      openTime: e.OpenTime,
      tagText,
      startNum: generateRandomNumber(3, 5),
      photoSrc,
      description: e.DescriptionDetail,
      ZipCode: e.ZipCode,
      Address: e.Address,
    }
```

改為：

```js
    return {
      city: e.City,
      id: e.ScenicSpotID,
      title: e.ScenicSpotName,
      phone: e.Phone,
      openTime: e.OpenTime,
      tagText,
      startNum: generateRandomNumber(3, 5),
      photoSrc,
      description: e.DescriptionDetail,
      ZipCode: e.ZipCode,
      Address: e.Address,
      websiteUrl: e.WebsiteUrl || null,
      hasParking: Object.keys(e.ParkingPosition || {}).length > 0,
    }
```

- [ ] **Step 2: 手動驗證欄位轉換正確**

在 `server/` 目錄下用 node 直接跑一段驗證腳本，確認來源資料的 `WebsiteUrl`/`ParkingPosition` 欄位存在且轉換邏輯正確（此步驟不啟動前端，純檢查資料與邏輯）：

Run:
```bash
cd server && node -e "
const data = JSON.parse(require('fs').readFileSync('data/allViewPoint.json','utf-8'));
const spot = data.find(s => s.ScenicSpotID === 'VCA_379000000A_000032');
console.log('websiteUrl:', spot.WebsiteUrl || null);
console.log('hasParking:', Object.keys(spot.ParkingPosition || {}).length > 0);
const empty = data.find(s => s.ScenicSpotID === 'VCA_371030000A_000046');
console.log('empty websiteUrl:', empty.WebsiteUrl || null);
console.log('empty hasParking:', Object.keys(empty.ParkingPosition || {}).length > 0);
"
```

Expected output:
```
websiteUrl: http://www.mocataipei.org.tw/
hasParking: false
empty websiteUrl: null
empty hasParking: false
```

- [ ] **Step 3: Commit**

```bash
git add src/common/processList.js
git commit -m "feat: expose websiteUrl and hasParking on processed view data"
```

---

### Task 2: 首頁「熱門打卡景點」改用真實資料

**Files:**
- Modify: `src/views/HomeView.vue`

**Interfaces:**
- Consumes: `homeViewStore.randomThreeItems`（`src/store/homeViewStore.js` 既有 state，型別為 `processViewData` 輸出的物件陣列，已經在 `HomeView.vue:10` 被 `storeToRefs` 解構出來，無需新增 import）。
- Produces: 無新介面，純刪除寫死資料。

- [ ] **Step 1: 刪除 `data1` 寫死陣列**

在 `src/views/HomeView.vue` 中，刪除第 13–55 行整段 `const data1 = [ ... ];`（從 `const data1 = [` 到對應的結尾 `];`，含三筆景點物件字面量）。

- [ ] **Step 2: 把 `<HotCheckInPoint>` 的 `data` prop 改為 `randomThreeItems`**

找到模板中的：

```html
    <HotCheckInPoint :data="data1"></HotCheckInPoint>
```

改為：

```html
    <HotCheckInPoint :data="randomThreeItems"></HotCheckInPoint>
```

`randomThreeItems` 已經在 `<script setup>` 第 10 行透過 `const { travelName, randomThreeItems } = storeToRefs(homeViewStore);` 解構出來，不需要新增 import 或修改該行。

- [ ] **Step 3: 手動驗證**

啟動後端與前端（兩個終端機）：

```bash
cd server && npm start
```

```bash
npm run dev
```

瀏覽器開 `http://localhost:5173/`，確認：
1. 「熱門打卡景點」區塊顯示 3 張卡片，卡片標題不是「烏來瀑布」「無極天元宮」「內門308高地」這三個寫死的名字（除非剛好隨機到，可重新整理頁面幾次觀察是否會變動）。
2. 點擊任一張卡片可以正確導向 `/viewList/<id>` 且該景點詳情頁能正常載入（不是 404 或「查無相關景點資訊」的 alert）。

- [ ] **Step 4: Commit**

```bash
git add src/views/HomeView.vue
git commit -m "feat: replace hardcoded homepage spots with live random API data"
```

---

### Task 3: 景點詳情頁「服務設施」→「聯絡資訊」，修好頂部電話／網址按鈕

**Files:**
- Modify: `src/page/viewPoint.vue`

**Interfaces:**
- Consumes: `renderViewData.phone`、`renderViewData.websiteUrl`、`renderViewData.hasParking`（Task 1 產出的欄位，透過 `renderViewData.value = processViewData([data])[0]` 已經自動帶入，`viewPoint.vue` 不需要修改 `loadViewData` 函式）。

- [ ] **Step 1: 修頂部電話按鈕（加上 `tel:` 連結，無資料時不渲染）**

在 `src/page/viewPoint.vue` 模板中找到（約第 141–159 行）：

```html
        <div class="flex gap-2">
          <div
            class="flex items-center justify-center w-[30px] h-[30px] rounded-full border-1 border-solid border-[#1Fb588]"
          >
            <img
              src="../assets/images/icon/phone-filled.svg"
              alt="phone"
              class="w-[18px]"
            />
          </div>
          <div
            class="flex items-center justify-center w-[30px] h-[30px] rounded-full border-1 border-solid border-[#1Fb588]"
          >
            <img
              src="../assets/images/icon/web.svg"
              alt="web"
              class="w-[18px]"
            />
          </div>
          <div
            class="flex items-center justify-center w-[30px] h-[30px] rounded-full border-1 border-solid border-[#1Fb588] cursor-pointer"
            @click="toggleFavoriteOnPage"
          >
            <img
              :src="isFavorited ? heartFilled : heartOutline"
              alt="heart"
              class="w-[18px]"
            />
          </div>
        </div>
```

改為：

```html
        <div class="flex gap-2">
          <a
            v-if="renderViewData.phone"
            :href="`tel:${renderViewData.phone}`"
            class="flex items-center justify-center w-[30px] h-[30px] rounded-full border-1 border-solid border-[#1Fb588]"
          >
            <img
              src="../assets/images/icon/phone-filled.svg"
              alt="phone"
              class="w-[18px]"
            />
          </a>
          <a
            v-if="renderViewData.websiteUrl"
            :href="renderViewData.websiteUrl"
            target="_blank"
            rel="noopener"
            class="flex items-center justify-center w-[30px] h-[30px] rounded-full border-1 border-solid border-[#1Fb588]"
          >
            <img
              src="../assets/images/icon/web.svg"
              alt="web"
              class="w-[18px]"
            />
          </a>
          <div
            class="flex items-center justify-center w-[30px] h-[30px] rounded-full border-1 border-solid border-[#1Fb588] cursor-pointer"
            @click="toggleFavoriteOnPage"
          >
            <img
              :src="isFavorited ? heartFilled : heartOutline"
              alt="heart"
              class="w-[18px]"
            />
          </div>
        </div>
```

- [ ] **Step 2: 把「服務設施」區塊改成「聯絡資訊」**

找到（約第 246–261 行）：

```html
      <!-- 景點特色 -->
      <div class="pt-8 grid gap-8">
        <div>
          <h4 class="text-[#188E6B] font-700 text-[24px] pb-2 md:text-[32px]">
            服務設施
          </h4>
          <ul class="flex gap-2 flex-col">
            <li class="flex items-center gap-2">
              <span>服務處</span>
              <img src="../assets/images/icon/check.svg" alt="" />
            </li>
            <li class="flex items-center gap-2">
              <span>公共廁所</span>
              <img src="../assets/images/icon/check.svg" alt="" />
            </li>
          </ul>
        </div>
```

改為：

```html
      <!-- 景點特色 -->
      <div class="pt-8 grid gap-8">
        <div>
          <h4 class="text-[#188E6B] font-700 text-[24px] pb-2 md:text-[32px]">
            聯絡資訊
          </h4>
          <ul class="flex gap-2 flex-col">
            <li v-if="renderViewData.phone" class="flex items-center gap-2">
              <span>電話：</span>
              <a :href="`tel:${renderViewData.phone}`" class="text-[#1FB588] underline">{{ renderViewData.phone }}</a>
            </li>
            <li v-if="renderViewData.websiteUrl" class="flex items-center gap-2">
              <span>官網：</span>
              <a :href="renderViewData.websiteUrl" target="_blank" rel="noopener" class="text-[#1FB588] underline">官方網站</a>
            </li>
            <li class="flex items-center gap-2">
              <span>停車資訊：</span>
              <span>{{ renderViewData.hasParking ? "有停車資訊" : "無停車資訊" }}</span>
            </li>
          </ul>
        </div>
```

（`<!-- 交通方式 -->` 開始的整段已被註解掉的區塊維持原狀不動，本次不處理。）

- [ ] **Step 3: 手動驗證（有完整資料的景點）**

`npm run dev` 開著的情況下，瀏覽器開 `http://localhost:5173/viewList/VCA_379000000A_000032`，確認：
1. 頁面頂部有電話與網址兩個可點擊圖示（滑鼠移上去游標變手指，非死按鈕）。點擊電話圖示應觸發瀏覽器撥號行為（或跳出撥號 App 提示，視作業系統而定）；點擊網址圖示應開新分頁到 `http://www.mocataipei.org.tw/`。
2. 「聯絡資訊」區塊顯示三行：電話（可點擊連結）、官網（連結文字「官方網站」）、停車資訊顯示「無停車資訊」。
3. 不再看到「服務處」「公共廁所」字樣。

- [ ] **Step 4: 手動驗證（缺資料的景點）**

瀏覽器開 `http://localhost:5173/viewList/VCA_371030000A_000046`，確認：
1. 頁面頂部只剩收藏（愛心）按鈕，電話與網址圖示都不出現。
2. 「聯絡資訊」區塊只顯示一行「停車資訊：無停車資訊」，沒有空白的電話／官網行、沒有壞掉的連結。

- [ ] **Step 5: Commit**

```bash
git add src/page/viewPoint.vue
git commit -m "fix: replace fabricated facility checklist with real contact info"
```

---

## Self-Review Notes

- **Spec coverage：** spec 三個改動點（首頁真實資料、`processList.js` 補欄位、詳情頁聯絡資訊 + 頂部按鈕）分別對應 Task 2、Task 1、Task 3，全部覆蓋。
- **Placeholder scan：** 無 TBD／TODO，所有步驟含完整程式碼與確切檔案位置。
- **Type consistency：** `websiteUrl`（Task 1 產出）與 `renderViewData.websiteUrl`（Task 3 消費）、`hasParking` 與 `renderViewData.hasParking` 命名一致；`phone` 沿用既有欄位名稱，未重新命名。
