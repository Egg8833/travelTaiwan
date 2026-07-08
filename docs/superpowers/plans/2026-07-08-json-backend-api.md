# JSON Backend API Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 廢棄 TDX API，新增 Express 後端提供 JSON 資料的唯讀 REST API，前端全面改走自建 API，並清除死碼與 bug。

**Architecture:** 專案根目錄新增獨立的 `server/`（Express，啟動時載入 JSON 進記憶體，六支 GET 端點）。前端 `src/api/index.js` 改為 axios instance（dev 走 Vite proxy，prod 讀 `VITE_API_BASE`），三個資料入口（viewStore、homeViewStore、hotView.vue、viewPoint.vue）改呼叫 API，移除 12MB JSON import。

**Tech Stack:** Node.js 18+（原生 `node:test` 與 `fetch`）、Express 4、cors、Vue 3、Pinia、axios、Vite 5。

## Global Constraints

- API 全部唯讀 GET，不做寫入。
- 回傳格式維持 TDX 原始欄位（`ScenicSpotID`、`ScenicSpotName`、`City`、`Picture`…），前端 `processList.js` 不動。
- `/api/scenic-spots` 的 `city` 參數收英文名（如 `Taipei`），後端用 cityList 對照中文過濾。
- 缺必填參數回 400 + `{message}`；`:id` 查無回 404 + `{message}`。
- 前端無測試框架：前端任務以 dev server 手動流程驗證；後端以 `node --test` 自動測試。
- Windows 環境，指令在 Git Bash 執行。

---

### Task 1: Express 後端（server/）含資料搬移與測試

**Files:**
- Create: `server/package.json`
- Create: `server/app.js`
- Create: `server/index.js`
- Create: `server/app.test.js`
- Move: `src/assets/data/allViewPoint.json` → `server/data/allViewPoint.json`
- Move: `src/assets/data/homeViewPoint.json` → `server/data/homeViewPoint.json`
- Copy: `src/assets/data/cityList.json` → `server/data/cityList.json`（前端 viewList.vue 仍用原檔，故複製非搬移）

**Interfaces:**
- Produces: HTTP API on `http://localhost:3000`：
  - `GET /api/scenic-spots?city=<EnName>&top=<n>` → TDX 格式景點陣列
  - `GET /api/scenic-spots/search?keyword=<kw>` → 景點陣列
  - `GET /api/scenic-spots/random?count=<n>` → 景點陣列（Picture 非空）
  - `GET /api/scenic-spots/:id` → 單筆景點物件
  - `GET /api/home-views` → homeViewPoint.json 原樣（6 區域陣列）
  - `GET /api/cities` → cityList.json 原樣

- [ ] **Step 1: 搬移資料檔（git mv 保留歷史）**

```bash
mkdir -p server/data
git mv src/assets/data/allViewPoint.json server/data/allViewPoint.json
git mv src/assets/data/homeViewPoint.json server/data/homeViewPoint.json
cp src/assets/data/cityList.json server/data/cityList.json
```

注意：此步後前端暫時編譯不過（import 斷掉），Task 4~7 修復。本任務結束即 commit，斷面僅存在於任務間。

- [ ] **Step 2: 建立 server/package.json 並安裝依賴**

```json
{
  "name": "traveltaiwan-server",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "test": "node --test"
  },
  "dependencies": {
    "express": "^4.19.2",
    "cors": "^2.8.5"
  }
}
```

Run: `cd server && npm install`

- [ ] **Step 3: 寫失敗測試 server/app.test.js**

```js
import {test, after} from 'node:test'
import assert from 'node:assert/strict'
import app from './app.js'

const server = app.listen(0)
const base = `http://localhost:${server.address().port}`
after(() => server.close())

const getJson = async path => {
  const res = await fetch(base + path)
  return {status: res.status, body: await res.json()}
}

test('GET /api/scenic-spots?city=Taipei 回傳臺北市景點且不超過 top', async () => {
  const {status, body} = await getJson('/api/scenic-spots?city=Taipei&top=5')
  assert.equal(status, 200)
  assert.ok(Array.isArray(body))
  assert.ok(body.length > 0 && body.length <= 5)
  assert.ok(body.every(s => s.City === '臺北市'))
})

test('GET /api/scenic-spots 缺 city 回 400', async () => {
  const {status, body} = await getJson('/api/scenic-spots')
  assert.equal(status, 400)
  assert.ok(body.message)
})

test('GET /api/scenic-spots 未知 city 回 400', async () => {
  const {status} = await getJson('/api/scenic-spots?city=Atlantis')
  assert.equal(status, 400)
})

test('GET /api/scenic-spots/search 依名稱過濾', async () => {
  const {status, body} = await getJson(
    '/api/scenic-spots/search?keyword=' + encodeURIComponent('沙灘'),
  )
  assert.equal(status, 200)
  assert.ok(body.length > 0)
  assert.ok(body.every(s => s.ScenicSpotName.includes('沙灘')))
})

test('GET /api/scenic-spots/search 缺 keyword 回 400', async () => {
  const {status} = await getJson('/api/scenic-spots/search')
  assert.equal(status, 400)
})

test('GET /api/scenic-spots/random 回傳指定數量且皆有圖片', async () => {
  const {status, body} = await getJson('/api/scenic-spots/random?count=3')
  assert.equal(status, 200)
  assert.equal(body.length, 3)
  assert.ok(body.every(s => Object.keys(s.Picture).length > 0))
})

test('GET /api/scenic-spots/:id 回傳單筆', async () => {
  const {body: list} = await getJson('/api/scenic-spots?city=Taipei&top=1')
  const id = list[0].ScenicSpotID
  const {status, body} = await getJson('/api/scenic-spots/' + id)
  assert.equal(status, 200)
  assert.equal(body.ScenicSpotID, id)
})

test('GET /api/scenic-spots/:id 查無回 404', async () => {
  const {status} = await getJson('/api/scenic-spots/NO_SUCH_ID')
  assert.equal(status, 404)
})

test('GET /api/home-views 回傳 6 區域', async () => {
  const {status, body} = await getJson('/api/home-views')
  assert.equal(status, 200)
  assert.equal(body.length, 6)
})

test('GET /api/cities 回傳城市清單', async () => {
  const {status, body} = await getJson('/api/cities')
  assert.equal(status, 200)
  assert.ok(body.some(c => c.City === 'Taipei' && c.CityName === '臺北市'))
})
```

- [ ] **Step 4: 跑測試確認失敗**

Run: `cd server && npm test`
Expected: FAIL — `Cannot find module ... app.js`

- [ ] **Step 5: 實作 server/app.js**

```js
import express from 'express'
import cors from 'cors'
import {readFileSync} from 'fs'
import {fileURLToPath} from 'url'
import {dirname, join} from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const load = name =>
  JSON.parse(readFileSync(join(__dirname, 'data', name), 'utf-8'))

const allViewPoint = load('allViewPoint.json')
const homeViewPoint = load('homeViewPoint.json')
const cityList = load('cityList.json')

const cityEnToZh = Object.fromEntries(cityList.map(c => [c.City, c.CityName]))

const app = express()
app.use(cors())

app.get('/api/scenic-spots', (req, res) => {
  const {city, top = 30} = req.query
  if (!city) return res.status(400).json({message: 'city is required'})
  const zhName = cityEnToZh[city]
  if (!zhName) return res.status(400).json({message: `unknown city: ${city}`})
  res.json(allViewPoint.filter(s => s.City === zhName).slice(0, Number(top)))
})

app.get('/api/scenic-spots/search', (req, res) => {
  const {keyword} = req.query
  if (!keyword) return res.status(400).json({message: 'keyword is required'})
  res.json(allViewPoint.filter(s => s.ScenicSpotName.includes(keyword)))
})

app.get('/api/scenic-spots/random', (req, res) => {
  const count = Number(req.query.count) || 3
  const pool = allViewPoint.filter(s => Object.keys(s.Picture).length > 0)
  const picked = []
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    picked.push(pool.splice(idx, 1)[0])
  }
  res.json(picked)
})

app.get('/api/scenic-spots/:id', (req, res) => {
  const spot = allViewPoint.find(s => s.ScenicSpotID === req.params.id)
  if (!spot) return res.status(404).json({message: 'scenic spot not found'})
  res.json(spot)
})

app.get('/api/home-views', (req, res) => res.json(homeViewPoint))

app.get('/api/cities', (req, res) => res.json(cityList))

export default app
```

注意：`/search`、`/random` 路由必須註冊在 `/:id` 之前，否則被 `:id` 吃掉。

- [ ] **Step 6: 實作 server/index.js**

```js
import app from './app.js'

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`travelTaiwan API server on http://localhost:${port}`)
})
```

- [ ] **Step 7: 跑測試確認通過**

Run: `cd server && npm test`
Expected: 全部 PASS（10 tests）

- [ ] **Step 8: Commit**

```bash
git add server/ src/assets/data
git commit -m "feat: add Express backend serving scenic spot JSON as read-only API"
```

---

### Task 2: 前端 API client + Vite proxy + 環境變數

**Files:**
- Rewrite: `src/api/index.js`
- Modify: `vite.config.js`
- Create: `.env.production`
- Modify: `package.json`（移除 `jssha`）

**Interfaces:**
- Produces（後續任務全部依賴）：
  - `getViewApi(city, top = 30)` → `Promise<TDX陣列>`
  - `searchViewApi(keyword)` → `Promise<TDX陣列>`
  - `getRandomViewApi(count = 3)` → `Promise<TDX陣列>`
  - `getViewByIdApi(id)` → `Promise<TDX單筆物件>`（404 時 axios reject）
  - `getHomeViewsApi()` → `Promise<6區域陣列>`

- [ ] **Step 1: 重寫 src/api/index.js**

```js
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
})

export const getViewApi = (city, top = 30) =>
  api.get('/scenic-spots', {params: {city, top}}).then(res => res.data)

export const searchViewApi = keyword =>
  api.get('/scenic-spots/search', {params: {keyword}}).then(res => res.data)

export const getRandomViewApi = (count = 3) =>
  api.get('/scenic-spots/random', {params: {count}}).then(res => res.data)

export const getViewByIdApi = id =>
  api.get(`/scenic-spots/${id}`).then(res => res.data)

export const getHomeViewsApi = () =>
  api.get('/home-views').then(res => res.data)
```

- [ ] **Step 2: vite.config.js 加 dev proxy**

在 `defineConfig({...})` 物件內加：

```js
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
```

- [ ] **Step 3: 建立 .env.production**

```
# 後端部署後填入實際網址，例如 https://traveltaiwan-api.onrender.com/api
VITE_API_BASE=/api
```

- [ ] **Step 4: 移除 jssha**

Run: `npm uninstall jssha`
確認 `package.json` dependencies 無 `jssha`。

- [ ] **Step 5: Commit**

```bash
git add src/api/index.js vite.config.js .env.production package.json package-lock.json
git commit -m "feat: replace TDX client with local API client and dev proxy"
```

---

### Task 3: viewStore 改走新 API

**Files:**
- Modify: `src/store/viewStore.js`

**Interfaces:**
- Consumes: `getViewApi(city, top)`（Task 2）
- Produces: store 介面不變 — `getViewsStoreData()`、`viewData`（processViewData 後陣列）、`setCityName(name)`

- [ ] **Step 1: 重寫 src/store/viewStore.js**

```js
import {ref} from 'vue'
import {defineStore} from 'pinia'
import {getViewApi} from '@/api/index.js'
import processViewData from '@/common/processList.js'

export const useViewListStore = defineStore('viewList', () => {
  const viewData = ref([])
  const cityName = ref('Taipei')
  const cityNameApi = ref('')

  function setCityName(name) {
    cityName.value = name
  }

  async function getViewsStoreData() {
    if (viewData.value.length > 0 && cityName.value === cityNameApi.value) {
      return
    }
    const list = await getViewApi(cityName.value)
    viewData.value = processViewData(list)
    cityNameApi.value = cityName.value
  }

  return {getViewsStoreData, viewData, setCityName}
})
```

變更點：移除 `onMounted`/`computed` 無用 import、移除 `cityData.json` 假資料註解、`viewList` ref 併入（原本只是中繼變數）。

- [ ] **Step 2: Commit**

```bash
git add src/store/viewStore.js
git commit -m "refactor: viewStore fetches scenic spots from local API"
```

---

### Task 4: homeViewStore 改走 API（搜尋 + 隨機推薦）

**Files:**
- Modify: `src/store/homeViewStore.js`

**Interfaces:**
- Consumes: `searchViewApi(keyword)`、`getRandomViewApi(count)`（Task 2）
- Produces: `travelName`、`searchTravel(name)`（改 async）、`haveSearchTravel`、`filteredData`、`randomThreeItems`、`refreshRandomItems(count = 3)`（新，Task 6 viewPoint.vue 依賴）
- 移除：`getRandomItemsFromArray`（改由後端 random 端點）

- [ ] **Step 1: 重寫 src/store/homeViewStore.js**

```js
import {defineStore} from 'pinia'
import {ref} from 'vue'
import processViewData from '@/common/processList.js'
import {useRouter} from 'vue-router'
import {searchViewApi, getRandomViewApi} from '@/api/index.js'

export const useHomeViewStore = defineStore('homeView', () => {
  const travelName = ref('')
  const haveSearchTravel = ref(false)
  const filteredData = ref([])
  const randomThreeItems = ref([])

  const router = useRouter()

  const searchTravel = async name => {
    if (travelName.value === '') {
      alert('請輸入景點名稱')
      return
    }
    const data = await searchViewApi(name)
    if (data.length === 0) {
      alert('查無相關景點資訊')
      travelName.value = ''
      return
    }
    filteredData.value = processViewData(data)
    haveSearchTravel.value = true
    router.push('/viewList')
  }

  const refreshRandomItems = async (count = 3) => {
    const data = await getRandomViewApi(count)
    randomThreeItems.value = processViewData(data)
  }
  refreshRandomItems()

  return {
    travelName,
    searchTravel,
    haveSearchTravel,
    filteredData,
    randomThreeItems,
    refreshRandomItems,
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add src/store/homeViewStore.js
git commit -m "refactor: homeViewStore uses search and random API endpoints"
```

---

### Task 5: hotView.vue 改走 API + 刪除死 store

**Files:**
- Modify: `src/components/homeView/hotView.vue`（僅 `<script setup>` 區塊）
- Delete: `src/store/hotViewStore.js`（無任何元件引用的死 store，且含 bug）

**Interfaces:**
- Consumes: `getHomeViewsApi()`（Task 2）
- Produces: 無（元件內部狀態）

- [ ] **Step 1: 修改 hotView.vue script**

第 2 行 `import homeViewData from "@/assets/data/homeViewPoint.json";` 刪除，改加：

```js
import { getHomeViewsApi } from "@/api/index.js";
import { onMounted } from "vue";
```

（`onMounted` 併入既有的 `import { computed, ref, watch } from "vue";`）

原本：

```js
const selectAreaData = computed(() => {
  idx.value = 0;
  return homeViewData[selectIndex.value][viewArea[selectIndex.value]];
});

const idx = ref(0);
```

改為（資料 async 載入 + 移除 computed 副作用）：

```js
const homeViewData = ref([]);
onMounted(async () => {
  homeViewData.value = await getHomeViewsApi();
});

const idx = ref(0);
const selectAreaData = computed(() => {
  const areaObj = homeViewData.value[selectIndex.value];
  return areaObj ? areaObj[viewArea[selectIndex.value]] : [];
});

watch(selectIndex, () => {
  idx.value = 0;
});
```

其餘（`maxIdx`、`clickAreaIdx`、`sliderStyle`、`watch(deviceWidth)`）不動。

- [ ] **Step 2: 刪除死 store**

```bash
git rm src/store/hotViewStore.js
```

- [ ] **Step 3: Commit**

```bash
git add src/components/homeView/hotView.vue
git commit -m "refactor: hotView fetches region data from API; drop dead hotViewStore"
```

---

### Task 6: viewPoint.vue 改為以 id 打單筆 API

**Files:**
- Modify: `src/page/viewPoint.vue`

**Interfaces:**
- Consumes: `getViewByIdApi(id)`（Task 2）、`homeViewStore.refreshRandomItems()`（Task 4）

- [ ] **Step 1: 改寫 script 資料邏輯**

刪除 import：`allViewPoint`、`useViewListStore`、`storeToRefs` 對 viewListStore 的使用（保留 homeViewStore 的 `storeToRefs`）。加 import：

```js
import { getViewByIdApi } from "@/api/index.js";
```

原本三分支 `renderViewData` computed（VCA 前綴 / 搜尋結果 / api 資料）整段刪除，`viewListStore` 相關三行刪除，改為：

```js
const route = useRoute();
const viewListId = ref(route.path.split("/").pop());
const renderViewData = ref(null);

const loadViewData = async (id) => {
  try {
    const data = await getViewByIdApi(id);
    renderViewData.value = processViewData([data])[0];
  } catch (e) {
    alert("查無相關景點資訊");
  }
};
loadViewData(viewListId.value);
```

`homeViewStore` 解構改為：

```js
const { filteredData, haveSearchTravel, randomThreeItems } =
  storeToRefs(homeViewStore);
const { refreshRandomItems } = homeViewStore;
```

`moveToNewViewPoint` 改為：

```js
const moveToNewViewPoint = (id) => {
  viewListId.value = id;
  loadViewData(id);
  refreshRandomItems();
};
```

- [ ] **Step 2: template 加載入防護**

template 最外層 `<div class="max-w-[1232px] mx-auto overflow-hidden">` 加 `v-if="renderViewData"`：

```html
<div v-if="renderViewData" class="max-w-[1232px] mx-auto overflow-hidden">
```

避免 async 載入完成前存取 `renderViewData.title` 報錯。

- [ ] **Step 3: Commit**

```bash
git add src/page/viewPoint.vue
git commit -m "refactor: viewPoint loads single spot by id from API"
```

---

### Task 7: viewList.vue 移除 computed 副作用

**Files:**
- Modify: `src/views/viewList.vue`（僅 script）

**Interfaces:**
- Consumes: `viewListStore.getViewsStoreData()`、`setCityName(name)`（Task 3）

- [ ] **Step 1: 修改 script**

`import { onMounted, ref, computed } from "vue";` 保持。

原本：

```js
const getSelectCityData = () => {
  haveSearchTravel.value = false;
  travelName.value = "";
  if (selectCity.value === "選擇地區") {
    alert("請選擇地區");
    return;
  }
  setCityName(selectCity.value);
};
const renderData = computed(() => {
  if (haveSearchTravel.value) {
    return filteredData.value;
  } else {
    getViewsStoreData(selectCity.value);
    return viewData.value;
  }
});
```

改為（computed 只讀，資料載入移到事件與 onMounted）：

```js
const getSelectCityData = () => {
  haveSearchTravel.value = false;
  travelName.value = "";
  if (selectCity.value === "選擇地區") {
    alert("請選擇地區");
    return;
  }
  setCityName(selectCity.value);
  getViewsStoreData();
};

onMounted(() => {
  if (!haveSearchTravel.value) {
    getViewsStoreData();
  }
});

const renderData = computed(() =>
  haveSearchTravel.value ? filteredData.value : viewData.value
);
```

（store 內 `cityName` 預設 `'Taipei'`，首次進頁載臺北市資料，行為同現況。）

- [ ] **Step 2: Commit**

```bash
git add src/views/viewList.vue
git commit -m "fix: remove async side effect from viewList renderData computed"
```

---

### Task 8: 清除死碼與死檔

**Files:**
- Delete: `src/components/card copy.vue`
- Delete: `src/assets/data/cityData.json`
- Delete: `src/assets/data/zipCode.json`
- Delete: `src/common/zipCodegenerating.js`
- Delete: `src/assets/data/data.json`（先確認無引用，見 Step 2）
- Modify: `src/views/HomeView.vue:8`（刪死 import）
- Modify: `src/router/index.js`（刪 `getDynamicBase`/`getBase`）

- [ ] **Step 1: 刪 HomeView.vue 死 import**

刪除第 8 行：

```js
import allViewPoint from "@/assets/data/allViewPoint.json";
```

（該變數在檔內無任何使用。）

- [ ] **Step 2: 確認 data.json 無引用後刪除**

Run: `grep -rn "data/data.json\|from '@/assets/data/data\|assets/data/data" src index.html`
Expected: 無結果 → 可刪。若有結果，保留該檔並記錄於 commit message。

- [ ] **Step 3: 刪除死檔**

```bash
git rm "src/components/card copy.vue" src/assets/data/cityData.json src/assets/data/zipCode.json src/common/zipCodegenerating.js src/assets/data/data.json
```

- [ ] **Step 4: 刪 router 死碼**

`src/router/index.js` 刪除第 7-15 行：

```js
const getDynamicBase = uri => {
  const BRANCH_REGEX = /^\/[a-z0-9-]+(\/\d{14}|\/\d{8}(_\w+)?)?/
  const match = uri.match(BRANCH_REGEX)
  return match ? match[0] : uri
}

const getBase = clientOnlyDynamicBase => {
  return clientOnlyDynamicBase(window.location.pathname)
}
```

- [ ] **Step 5: 全案掃殘留引用**

Run: `grep -rn "allViewPoint\|homeViewPoint\|zipCode\|cityData\|jssha\|getRandomItemsFromArray\|hotViewStore" src --include="*.vue" --include="*.js"`
Expected: 無結果（`cityList` 不在掃描項，前端仍合法使用）。

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "chore: remove dead files, dead imports, and unused router helpers"
```

---

### Task 9: 端到端驗證 + README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 啟動後端**

Run: `cd server && npm start`（背景執行）
Expected: `travelTaiwan API server on http://localhost:3000`

- [ ] **Step 2: 啟動前端 dev server 並手動驗證三流程**

Run: `npm run dev`

1. 首頁：熱門區域切換（北/中/南/東/離島）資料有變、隨機三筆推薦有圖。
2. 首頁搜尋「楓」→ 跳列表頁有結果；列表頁下拉選「臺中市」→ 顯示臺中景點。
3. 點任一景點卡 → 單一景點頁 title/圖/描述正常；頁內推薦景點點擊 → 換頁資料更新。

Console 無紅字錯誤。

- [ ] **Step 3: build 驗證 bundle 無 12MB JSON**

Run: `npm run build && du -sh dist && ls dist/assets | head -20`
Expected: build 成功，`dist` 總大小遠小於 12MB（原本 bundle 含 allViewPoint）。

- [ ] **Step 4: README 補後端章節**

README.md 追加：

```markdown
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

### 雲端部署（Render/Railway）

1. 部署 `server/` 目錄（start command: `npm start`，`PORT` 由平台注入）。
2. 前端 `.env.production` 的 `VITE_API_BASE` 改為後端網址（例：`https://xxx.onrender.com/api`）後重新 `npm run deploy`。
3. 免費層有 cold start（閒置後首次請求約需 30 秒喚醒）。
```

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add backend API usage and deployment guide"
```
