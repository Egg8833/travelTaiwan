# 會員登入、景點收藏、景點評論 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Task 1 is a manual task for the human user, not a subagent** — it requires interactive access to the Firebase Console. Do not dispatch it to a coding subagent. All later tasks assume Task 1's outputs (env vars) exist, but are written/tested with fakes so they do not require real Firebase credentials to implement or test.

**Goal:** Add Firebase-based member login (Email/密碼 + Google), a per-user 景點收藏 (favorites) feature, and a 景點評論 (reviews, text + 1–5 star rating) feature to travelTaiwan, per `docs/superpowers/specs/2026-07-09-member-auth-favorites-reviews-design.md`.

**Architecture:** Firebase Authentication handles login/signup on the frontend (Firebase JS SDK, no passwords touch our backend). Firestore stores only user-private data (favorites, reviews). The existing Express backend (`server/`) gains new endpoints protected by a `verifyFirebaseToken` middleware that validates the Firebase ID token via `firebase-admin` and reads/writes Firestore through small repository modules. Existing scenic-spot JSON endpoints are untouched.

**Tech Stack:** Vue 3 (Composition API) + Pinia + vue-router + axios (frontend), Express 4 + `firebase-admin` (backend), Firebase Authentication + Firestore (managed services), Node's built-in `node:test` runner for backend tests.

## Global Constraints

- No new frontend test framework — frontend verification is manual (per spec's Non-Goals). Backend keeps using `node:test` (existing convention in `server/app.test.js`).
- No passwords stored anywhere in our own database — Firebase Auth owns credentials.
- Scenic spot data stays in `server/data/*.json`; only user-private data (favorites, reviews) goes into Firestore.
- All new Express routes must be documented in `server/openapi.js` and use the existing `Error` schema (`{message: string}`) for error responses.
- Backend route handlers must not talk to real Firebase/Firestore in tests — inject fakes via the `createApp(deps)` factory (see Task 1).
- Pinia stores follow the existing Composition-API style seen in `src/store/homeViewStore.js` (`ref` + plain functions, explicit `return {...}`).
- Error handling in new frontend stores follows the existing pattern: `try/catch`, `console.error`, `alert()` — no new toast/notification library.

---

## Task 1: Firebase project setup (⚠️ manual — user action, not a subagent)

**Files:** none (external console work) — produces environment variables consumed by later tasks.

- [ ] **Step 1: Create Firebase project**

Go to https://console.firebase.google.com/ → "Add project" → name it (e.g. `traveltaiwan`) → finish creation.

- [ ] **Step 2: Enable Authentication providers**

In the Firebase console: Build → Authentication → Get started → Sign-in method tab → enable **Email/Password** and **Google**. For Google, set a support email (required by the console).

- [ ] **Step 3: Create Firestore database**

Build → Firestore Database → Create database → choose a region close to your users (e.g. `asia-east1`) → start in **production mode** (we supply explicit rules in the next step, not the default "test mode" which expires).

- [ ] **Step 4: Deploy Firestore security rules**

In Firestore → Rules tab, replace the contents with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /favorites/{uid}/spots/{spotId} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /reviews/{spotId}/entries/{reviewId} {
      allow read: if true;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.uid;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.uid;
    }
  }
}
```

Click **Publish**. (These rules are a second line of defense — our own Express API is the primary write path and already checks `uid`, but this stops anyone from bypassing the API with a Firestore client SDK using a stolen token for a *different* user's data.)

- [ ] **Step 5: Get the frontend web config**

Project settings (gear icon) → General tab → "Your apps" → Add app → Web (`</>`) → register app (nickname e.g. `traveltaiwan-web`) → copy the `firebaseConfig` object shown (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).

- [ ] **Step 6: Create the frontend env file**

Create `c:\Users\user\Desktop\travelTaiwan\.env` (this file is for local dev; it must **not** be committed — confirm `.env` is covered by `.gitignore`, add it if not) with the values from Step 5:

```
VITE_FIREBASE_API_KEY=<apiKey from step 5>
VITE_FIREBASE_AUTH_DOMAIN=<authDomain from step 5>
VITE_FIREBASE_PROJECT_ID=<projectId from step 5>
VITE_FIREBASE_STORAGE_BUCKET=<storageBucket from step 5>
VITE_FIREBASE_MESSAGING_SENDER_ID=<messagingSenderId from step 5>
VITE_FIREBASE_APP_ID=<appId from step 5>
```

Also add the same 6 keys (with the deployed backend's own values — they're identical, this config is not secret, it identifies the project to the browser) to whatever env var mechanism your production hosting uses for the frontend build (e.g. GitHub Actions secrets if `npm run deploy` runs in CI, or set them locally before `npm run deploy` if run from a dev machine).

- [ ] **Step 7: Get the backend service account key**

Project settings → Service accounts tab → "Generate new private key" → confirm → a JSON file downloads. **Do not commit this file.**

- [ ] **Step 8: Create the backend env var**

Set an environment variable `FIREBASE_SERVICE_ACCOUNT_JSON` containing the *entire contents* of the downloaded JSON file as a single-line string. For local dev, create `c:\Users\user\Desktop\travelTaiwan\server\.env` (confirm `server/.env` is gitignored, add it if not):

```
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...", ... the full JSON, minified to one line ...}
```

For production hosting (Render/Railway per `README.md`'s deployment section), set `FIREBASE_SERVICE_ACCOUNT_JSON` as a platform environment variable with the same minified JSON value.

- [ ] **Step 9: Confirm `.gitignore` covers both env files**

Run:

```bash
git check-ignore -v .env server/.env
```

Expected: both paths print a match. If either does not, add `.env` and `server/.env` to the root `.gitignore` before proceeding, then re-run this command to confirm.

---

## Task 2: Refactor `server/app.js` into an injectable factory

**Why:** New auth-protected routes need a way to be tested without hitting real Firebase. The cleanest way is dependency injection — `createApp(deps)` instead of a module-level `app` instance.

**Files:**
- Modify: `server/app.js` (full rewrite, behavior-preserving for existing routes)
- Modify: `server/index.js`
- Modify: `server/app.test.js`

**Interfaces:**
- Produces: `createApp({verifyToken, favoritesRepo, reviewsRepo})` — named export from `server/app.js`. `verifyToken` is an Express middleware `(req, res, next) => void`. `favoritesRepo`/`reviewsRepo` are unused by this task's routes (existing scenic-spot routes only) but the parameter shape is fixed here so Tasks 3–4 can rely on it.

- [ ] **Step 1: Rewrite `server/app.test.js` to use the factory with fakes**

```javascript
import {test, after} from 'node:test'
import assert from 'node:assert/strict'
import {createApp} from './app.js'

const fakeVerifyToken = (req, res, next) => {
  const header = req.headers.authorization || ''
  if (header === 'Bearer valid-token') {
    req.uid = 'test-uid'
    req.firebaseUser = {uid: 'test-uid', email: 'test@example.com', name: 'Test User'}
    return next()
  }
  return res.status(401).json({message: 'invalid or expired token'})
}

const fakeFavoritesRepo = {
  async list() { return [] },
  async add() { return {} },
  async remove() {},
}

const fakeReviewsRepo = {
  async list() { return [] },
  async add() { return {} },
  async update() { return {error: 'not_found'} },
  async remove() { return {error: 'not_found'} },
}

const app = createApp({
  verifyToken: fakeVerifyToken,
  favoritesRepo: fakeFavoritesRepo,
  reviewsRepo: fakeReviewsRepo,
})
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

test('GET /api/openapi.json 回傳 OpenAPI spec', async () => {
  const {status, body} = await getJson('/api/openapi.json')
  assert.equal(status, 200)
  assert.equal(body.openapi, '3.0.3')
  assert.ok(body.paths['/api/scenic-spots'])
})

test('GET /api-docs 提供 Swagger UI 頁面', async () => {
  const res = await fetch(base + '/api-docs/')
  assert.equal(res.status, 200)
  const html = await res.text()
  assert.ok(html.includes('swagger-ui'))
})

export {fakeVerifyToken, fakeFavoritesRepo, fakeReviewsRepo, createApp, base, getJson}
```

Note: the `Object.keys(body.paths).length` assertion from the old test is removed here — path count will change as endpoints are added in later tasks, so it's re-added once as a final fixed number in Task 5 instead of being maintained across every task.

- [ ] **Step 2: Run tests to verify they fail (import error — `createApp` doesn't exist yet)**

Run: `cd server && npm test`
Expected: FAIL — `SyntaxError` or `TypeError: createApp is not a function` (named export doesn't exist in `app.js` yet).

- [ ] **Step 3: Rewrite `server/app.js` as a factory, preserving all existing route logic**

```javascript
import express from 'express'
import cors from 'cors'
import swaggerUi from 'swagger-ui-express'
import {readFileSync} from 'fs'
import {fileURLToPath} from 'url'
import {dirname, join} from 'path'
import openapiSpec from './openapi.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const load = name =>
  JSON.parse(readFileSync(join(__dirname, 'data', name), 'utf-8'))

const allViewPoint = load('allViewPoint.json')
const homeViewPoint = load('homeViewPoint.json')
const cityList = load('cityList.json')

const cityEnToZh = Object.fromEntries(cityList.map(c => [c.City, c.CityName]))

export function createApp({verifyToken, favoritesRepo, reviewsRepo}) {
  const app = express()
  app.use(cors())
  app.use(express.json())

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

  app.get('/api/auth/me', verifyToken, (req, res) => {
    res.json({
      uid: req.uid,
      email: req.firebaseUser.email,
      displayName: req.firebaseUser.name || null,
    })
  })

  app.get('/api/favorites', verifyToken, async (req, res) => {
    res.json(await favoritesRepo.list(req.uid))
  })

  app.post('/api/favorites/:spotId', verifyToken, async (req, res) => {
    const {spotName, pictureUrl} = req.body
    if (!spotName) return res.status(400).json({message: 'spotName is required'})
    const data = await favoritesRepo.add(req.uid, req.params.spotId, {spotName, pictureUrl})
    res.status(201).json(data)
  })

  app.delete('/api/favorites/:spotId', verifyToken, async (req, res) => {
    await favoritesRepo.remove(req.uid, req.params.spotId)
    res.status(204).end()
  })

  app.get('/api/reviews/:spotId', async (req, res) => {
    res.json(await reviewsRepo.list(req.params.spotId))
  })

  app.post('/api/reviews/:spotId', verifyToken, async (req, res) => {
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
    res.status(201).json(review)
  })

  app.patch('/api/reviews/:spotId/:reviewId', verifyToken, async (req, res) => {
    const {rating, content} = req.body
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({message: 'rating must be between 1 and 5'})
    }
    if (!content) return res.status(400).json({message: 'content is required'})
    const result = await reviewsRepo.update(req.params.spotId, req.params.reviewId, req.uid, {rating, content})
    if (result.error === 'not_found') return res.status(404).json({message: 'review not found'})
    if (result.error === 'forbidden') return res.status(403).json({message: 'not your review'})
    res.json(result)
  })

  app.delete('/api/reviews/:spotId/:reviewId', verifyToken, async (req, res) => {
    const result = await reviewsRepo.remove(req.params.spotId, req.params.reviewId, req.uid)
    if (result.error === 'not_found') return res.status(404).json({message: 'review not found'})
    if (result.error === 'forbidden') return res.status(403).json({message: 'not your review'})
    res.status(204).end()
  })

  app.get('/api/openapi.json', (req, res) => res.json(openapiSpec))

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec))

  return app
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npm test`
Expected: PASS — all tests green (favorites/reviews routes exist now but aren't tested yet; that's Tasks 3–4).

- [ ] **Step 5: Update `server/index.js` to build real dependencies**

This step references `./firebaseAdmin.js`, `./middleware/verifyFirebaseToken.js`, `./repositories/favoritesRepo.js`, `./repositories/reviewsRepo.js` which don't exist yet — they're created in Tasks 3 and 4. Write `server/index.js` now so it's ready, but note it will not run successfully until those files exist (that's fine; `npm test` doesn't import `index.js`).

```javascript
import {createApp} from './app.js'
import {auth, firestore} from './firebaseAdmin.js'
import {createVerifyFirebaseToken} from './middleware/verifyFirebaseToken.js'
import {createFavoritesRepo} from './repositories/favoritesRepo.js'
import {createReviewsRepo} from './repositories/reviewsRepo.js'

const app = createApp({
  verifyToken: createVerifyFirebaseToken(auth),
  favoritesRepo: createFavoritesRepo(firestore),
  reviewsRepo: createReviewsRepo(firestore),
})

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`travelTaiwan API server on http://localhost:${port}`)
})
```

- [ ] **Step 6: Commit**

```bash
git add server/app.js server/app.test.js server/index.js
git commit -m "refactor: turn server/app.js into an injectable factory for testability"
```

---

## Task 3: Firebase Admin SDK integration + `verifyFirebaseToken` middleware

**Files:**
- Create: `server/firebaseAdmin.js`
- Create: `server/middleware/verifyFirebaseToken.js`
- Test: `server/middleware/verifyFirebaseToken.test.js`
- Modify: `server/package.json` (add `firebase-admin` dependency)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `createVerifyFirebaseToken(authClient)` — takes an object shaped like `{verifyIdToken: (token) => Promise<{uid, email, name}>}` and returns an Express middleware. On success sets `req.uid` and `req.firebaseUser`; on missing/invalid token responds `401 {message}`. Also `auth` and `firestore` named exports from `firebaseAdmin.js`, consumed by `server/index.js` (already wired in Task 2 Step 5) and by Task 4's repositories.

- [ ] **Step 1: Install `firebase-admin`**

```bash
cd server && npm install firebase-admin
```

- [ ] **Step 2: Write the failing test**

Create `server/middleware/verifyFirebaseToken.test.js`:

```javascript
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createVerifyFirebaseToken} from './verifyFirebaseToken.js'

const makeReqRes = headers => {
  const req = {headers}
  const res = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
  }
  return {req, res}
}

test('missing Authorization header → 401', async () => {
  const middleware = createVerifyFirebaseToken({verifyIdToken: async () => { throw new Error('should not be called') }})
  const {req, res} = makeReqRes({})
  let nextCalled = false
  await middleware(req, res, () => { nextCalled = true })
  assert.equal(nextCalled, false)
  assert.equal(res.statusCode, 401)
  assert.ok(res.body.message)
})

test('invalid token → 401', async () => {
  const middleware = createVerifyFirebaseToken({verifyIdToken: async () => { throw new Error('invalid') }})
  const {req, res} = makeReqRes({authorization: 'Bearer bad-token'})
  let nextCalled = false
  await middleware(req, res, () => { nextCalled = true })
  assert.equal(nextCalled, false)
  assert.equal(res.statusCode, 401)
})

test('valid token → sets req.uid/req.firebaseUser and calls next', async () => {
  const fakeAuth = {
    verifyIdToken: async token => {
      assert.equal(token, 'good-token')
      return {uid: 'user-123', email: 'a@b.com', name: 'Alice'}
    },
  }
  const middleware = createVerifyFirebaseToken(fakeAuth)
  const {req, res} = makeReqRes({authorization: 'Bearer good-token'})
  let nextCalled = false
  await middleware(req, res, () => { nextCalled = true })
  assert.equal(nextCalled, true)
  assert.equal(req.uid, 'user-123')
  assert.equal(req.firebaseUser.email, 'a@b.com')
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd server && node --test middleware/verifyFirebaseToken.test.js`
Expected: FAIL — `Cannot find module './verifyFirebaseToken.js'`

- [ ] **Step 4: Implement the middleware**

Create `server/middleware/verifyFirebaseToken.js`:

```javascript
export const createVerifyFirebaseToken = authClient => async (req, res, next) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({message: 'missing bearer token'})
  try {
    const decoded = await authClient.verifyIdToken(token)
    req.uid = decoded.uid
    req.firebaseUser = decoded
    next()
  } catch {
    res.status(401).json({message: 'invalid or expired token'})
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && node --test middleware/verifyFirebaseToken.test.js`
Expected: PASS — 3 tests green.

- [ ] **Step 6: Create `server/firebaseAdmin.js`**

```javascript
import admin from 'firebase-admin'

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
if (!serviceAccountJson) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON env var is required')
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
  })
}

export const auth = admin.auth()
export const firestore = admin.firestore()
```

This file is only imported by `server/index.js` (production entry point) and never by test files, so `npm test` never requires `FIREBASE_SERVICE_ACCOUNT_JSON` to be set.

- [ ] **Step 7: Run the full backend test suite to confirm nothing broke**

Run: `cd server && npm test`
Expected: PASS — all tests (existing scenic-spot tests + new middleware tests) green.

- [ ] **Step 8: Commit**

```bash
git add server/firebaseAdmin.js server/middleware/verifyFirebaseToken.js server/middleware/verifyFirebaseToken.test.js server/package.json server/package-lock.json
git commit -m "feat: add Firebase Admin SDK integration and token verification middleware"
```

---

## Task 4: Favorites repository + route tests

**Files:**
- Create: `server/repositories/favoritesRepo.js`
- Modify: `server/app.test.js` (add favorites endpoint tests, replace the stub `fakeFavoritesRepo`)

**Interfaces:**
- Consumes: `createApp` from Task 2, `createVerifyFirebaseToken` pattern from Task 3 (tests use their own fake, matching the same header contract: `Authorization: Bearer valid-token` → `req.uid = 'test-uid'`).
- Produces: `createFavoritesRepo(firestore)` returning `{list(uid), add(uid, spotId, {spotName, pictureUrl}), remove(uid, spotId)}`, consumed by `server/index.js` (already wired in Task 2 Step 5).

- [ ] **Step 1: Add failing favorites route tests to `server/app.test.js`**

Replace the `fakeFavoritesRepo` constant and add these tests (insert after the existing `/api/openapi.json` test, before the `/api-docs` test):

```javascript
// Replace the old fakeFavoritesRepo stub with a stateful in-memory fake:
const favoritesStore = new Map() // uid -> Map(spotId -> data)
const fakeFavoritesRepo = {
  async list(uid) {
    return [...(favoritesStore.get(uid) || new Map()).values()]
  },
  async add(uid, spotId, {spotName, pictureUrl}) {
    if (!favoritesStore.has(uid)) favoritesStore.set(uid, new Map())
    const data = {spotId, spotName, pictureUrl, addedAt: new Date().toISOString()}
    favoritesStore.get(uid).set(spotId, data)
    return data
  },
  async remove(uid, spotId) {
    favoritesStore.get(uid)?.delete(spotId)
  },
}
```

```javascript
test('GET /api/favorites 未帶 token 回 401', async () => {
  const {status} = await getJson('/api/favorites')
  assert.equal(status, 401)
})

test('POST → GET → DELETE /api/favorites 完整流程', async () => {
  const authHeaders = {headers: {Authorization: 'Bearer valid-token', 'Content-Type': 'application/json'}}

  const postRes = await fetch(base + '/api/favorites/spot-1', {
    method: 'POST',
    ...authHeaders,
    body: JSON.stringify({spotName: '國立故宮博物院', pictureUrl: 'http://example.com/a.jpg'}),
  })
  assert.equal(postRes.status, 201)
  const posted = await postRes.json()
  assert.equal(posted.spotId, 'spot-1')

  const listRes = await fetch(base + '/api/favorites', {headers: authHeaders.headers})
  assert.equal(listRes.status, 200)
  const list = await listRes.json()
  assert.ok(list.some(f => f.spotId === 'spot-1'))

  const deleteRes = await fetch(base + '/api/favorites/spot-1', {method: 'DELETE', headers: authHeaders.headers})
  assert.equal(deleteRes.status, 204)

  const listRes2 = await fetch(base + '/api/favorites', {headers: authHeaders.headers})
  const list2 = await listRes2.json()
  assert.ok(!list2.some(f => f.spotId === 'spot-1'))
})

test('POST /api/favorites/:spotId 缺 spotName 回 400', async () => {
  const res = await fetch(base + '/api/favorites/spot-2', {
    method: 'POST',
    headers: {Authorization: 'Bearer valid-token', 'Content-Type': 'application/json'},
    body: JSON.stringify({}),
  })
  assert.equal(res.status, 400)
})
```

Also change `fakeVerifyToken` (defined in Task 2 Step 1) is already correct as-is — no change needed there, since it already accepts `Bearer valid-token`.

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `cd server && npm test`
Expected: FAIL on the 3 new tests — `favoritesRepo` fake methods exist already as stubs returning empty data, but the route logic in `app.js` already calls them correctly (built in Task 2), so actually re-check: these tests should currently FAIL only if the stub fake (`async list() { return [] }` etc. from Task 2) is still in place instead of the stateful one from this step. Confirm by running — expected failure is the "POST → GET → DELETE" test asserting on data that the old flat stub never stored.

- [ ] **Step 3: Confirm tests pass with the stateful fake already in place**

Run: `cd server && npm test`
Expected: PASS — since `app.js` route logic was already fully implemented in Task 2, only the test fake needed upgrading. All tests green.

- [ ] **Step 4: Implement the real repository**

Create `server/repositories/favoritesRepo.js`:

```javascript
export const createFavoritesRepo = firestore => ({
  async list(uid) {
    const snap = await firestore
      .collection('favorites')
      .doc(uid)
      .collection('spots')
      .orderBy('addedAt', 'desc')
      .get()
    return snap.docs.map(d => d.data())
  },

  async add(uid, spotId, {spotName, pictureUrl}) {
    const ref = firestore.collection('favorites').doc(uid).collection('spots').doc(spotId)
    const data = {spotId, spotName, pictureUrl: pictureUrl || null, addedAt: new Date().toISOString()}
    await ref.set(data)
    return data
  },

  async remove(uid, spotId) {
    await firestore.collection('favorites').doc(uid).collection('spots').doc(spotId).delete()
  },
})
```

- [ ] **Step 5: Run the full backend suite once more**

Run: `cd server && npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/repositories/favoritesRepo.js server/app.test.js
git commit -m "feat: add favorites API backed by Firestore"
```

---

## Task 5: Reviews repository + route tests

**Files:**
- Create: `server/repositories/reviewsRepo.js`
- Modify: `server/app.test.js` (replace `fakeReviewsRepo` stub, add tests)

**Interfaces:**
- Produces: `createReviewsRepo(firestore)` returning `{list(spotId), add(spotId, {uid, authorName, rating, content}), update(spotId, reviewId, uid, {rating, content}), remove(spotId, reviewId, uid)}` — `update`/`remove` return `{error: null}` on success or `{error: 'not_found' | 'forbidden'}`. Consumed by `server/index.js` (already wired in Task 2 Step 5).

- [ ] **Step 1: Replace `fakeReviewsRepo` with a stateful fake and add failing tests**

```javascript
// Replace the old fakeReviewsRepo stub:
const reviewsStore = new Map() // spotId -> Map(reviewId -> data)
let nextReviewId = 1
const fakeReviewsRepo = {
  async list(spotId) {
    return [...(reviewsStore.get(spotId) || new Map()).values()]
  },
  async add(spotId, {uid, authorName, rating, content}) {
    if (!reviewsStore.has(spotId)) reviewsStore.set(spotId, new Map())
    const id = String(nextReviewId++)
    const data = {id, uid, authorName, rating, content, isSeed: false, createdAt: new Date().toISOString(), updatedAt: null}
    reviewsStore.get(spotId).set(id, data)
    return data
  },
  async update(spotId, reviewId, uid, {rating, content}) {
    const entry = reviewsStore.get(spotId)?.get(reviewId)
    if (!entry) return {error: 'not_found'}
    if (entry.uid !== uid) return {error: 'forbidden'}
    entry.rating = rating
    entry.content = content
    entry.updatedAt = new Date().toISOString()
    return entry
  },
  async remove(spotId, reviewId, uid) {
    const entry = reviewsStore.get(spotId)?.get(reviewId)
    if (!entry) return {error: 'not_found'}
    if (entry.uid !== uid) return {error: 'forbidden'}
    reviewsStore.get(spotId).delete(reviewId)
    return {error: null}
  },
}
```

```javascript
test('GET /api/reviews/:spotId 不需登入，空清單回 200', async () => {
  const {status, body} = await getJson('/api/reviews/spot-9')
  assert.equal(status, 200)
  assert.deepEqual(body, [])
})

test('POST /api/reviews/:spotId 未帶 token 回 401', async () => {
  const res = await fetch(base + '/api/reviews/spot-9', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({rating: 5, content: '很棒'}),
  })
  assert.equal(res.status, 401)
})

test('POST /api/reviews/:spotId rating 超出範圍回 400', async () => {
  const res = await fetch(base + '/api/reviews/spot-9', {
    method: 'POST',
    headers: {Authorization: 'Bearer valid-token', 'Content-Type': 'application/json'},
    body: JSON.stringify({rating: 6, content: '很棒'}),
  })
  assert.equal(res.status, 400)
})

test('新增 → 編輯 → 刪除自己的評論', async () => {
  const authHeaders = {Authorization: 'Bearer valid-token', 'Content-Type': 'application/json'}

  const postRes = await fetch(base + '/api/reviews/spot-9', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({rating: 4, content: '景色不錯'}),
  })
  assert.equal(postRes.status, 201)
  const created = await postRes.json()
  assert.equal(created.rating, 4)

  const patchRes = await fetch(base + `/api/reviews/spot-9/${created.id}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({rating: 5, content: '景色非常棒'}),
  })
  assert.equal(patchRes.status, 200)
  const updated = await patchRes.json()
  assert.equal(updated.rating, 5)
  assert.equal(updated.content, '景色非常棒')

  const deleteRes = await fetch(base + `/api/reviews/spot-9/${created.id}`, {
    method: 'DELETE',
    headers: authHeaders,
  })
  assert.equal(deleteRes.status, 204)

  const {body: listAfter} = await getJson('/api/reviews/spot-9')
  assert.ok(!listAfter.some(r => r.id === created.id))
})

test('編輯不存在的評論回 404', async () => {
  const res = await fetch(base + '/api/reviews/spot-9/no-such-id', {
    method: 'PATCH',
    headers: {Authorization: 'Bearer valid-token', 'Content-Type': 'application/json'},
    body: JSON.stringify({rating: 5, content: 'x'}),
  })
  assert.equal(res.status, 404)
})
```

- [ ] **Step 2: Run tests to verify current state**

Run: `cd server && npm test`
Expected: PASS — route handlers already exist from Task 2, and the stateful fake now correctly backs them. If any test fails, re-check the fake matches the interface shape used by the `app.js` handlers written in Task 2 Step 3.

- [ ] **Step 3: Implement the real repository**

Create `server/repositories/reviewsRepo.js`:

```javascript
export const createReviewsRepo = firestore => ({
  async list(spotId) {
    const snap = await firestore
      .collection('reviews')
      .doc(spotId)
      .collection('entries')
      .orderBy('createdAt', 'desc')
      .get()
    return snap.docs.map(d => ({id: d.id, ...d.data()}))
  },

  async add(spotId, {uid, authorName, rating, content}) {
    const ref = firestore.collection('reviews').doc(spotId).collection('entries').doc()
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

  async update(spotId, reviewId, uid, {rating, content}) {
    const ref = firestore.collection('reviews').doc(spotId).collection('entries').doc(reviewId)
    const snap = await ref.get()
    if (!snap.exists) return {error: 'not_found'}
    if (snap.data().uid !== uid) return {error: 'forbidden'}
    const updatedAt = new Date().toISOString()
    await ref.update({rating, content, updatedAt})
    return {id: reviewId, ...snap.data(), rating, content, updatedAt}
  },

  async remove(spotId, reviewId, uid) {
    const ref = firestore.collection('reviews').doc(spotId).collection('entries').doc(reviewId)
    const snap = await ref.get()
    if (!snap.exists) return {error: 'not_found'}
    if (snap.data().uid !== uid) return {error: 'forbidden'}
    await ref.delete()
    return {error: null}
  },
})
```

- [ ] **Step 4: Run the full backend suite**

Run: `cd server && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/repositories/reviewsRepo.js server/app.test.js
git commit -m "feat: add reviews API backed by Firestore"
```

---

## Task 6: Document new endpoints in OpenAPI spec

**Files:**
- Modify: `server/openapi.js`
- Modify: `server/app.test.js` (re-add a fixed path-count assertion)

**Interfaces:**
- Consumes: nothing new — purely documents existing routes from Tasks 2–5.

- [ ] **Step 1: Add new schemas and paths to `server/openapi.js`**

Add these two schema constants near `errorSchema` (after it):

```javascript
const favoriteSchema = {
  type: 'object',
  properties: {
    spotId: {type: 'string', example: 'VCA_315080500H_000015'},
    spotName: {type: 'string', example: '國立故宮博物院'},
    pictureUrl: {type: 'string', nullable: true},
    addedAt: {type: 'string', format: 'date-time'},
  },
}

const reviewSchema = {
  type: 'object',
  properties: {
    id: {type: 'string'},
    uid: {type: 'string', nullable: true},
    authorName: {type: 'string', example: '旅人A'},
    rating: {type: 'integer', minimum: 1, maximum: 5},
    content: {type: 'string'},
    isSeed: {type: 'boolean'},
    createdAt: {type: 'string', format: 'date-time'},
    updatedAt: {type: 'string', format: 'date-time', nullable: true},
  },
}
```

Add `bearerAuth` security scheme and a `Member`/`Review` tag to the `tags` array (change it to):

```javascript
  tags: [
    {name: 'ScenicSpot', description: '景點查詢'},
    {name: 'Misc', description: '其他資料'},
    {name: 'Member', description: '會員與收藏（需登入）'},
    {name: 'Review', description: '景點評論'},
  ],
```

Add these paths inside the existing `paths` object (after `/api/cities`, before the closing brace):

```javascript
    '/api/auth/me': {
      get: {
        tags: ['Member'],
        summary: '取得目前登入者資訊',
        security: [{bearerAuth: []}],
        responses: {
          200: {
            description: '登入者基本資訊',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    uid: {type: 'string'},
                    email: {type: 'string'},
                    displayName: {type: 'string', nullable: true},
                  },
                },
              },
            },
          },
          401: {description: '未登入或 Token 無效', content: {'application/json': {schema: {$ref: '#/components/schemas/Error'}}}},
        },
      },
    },
    '/api/favorites': {
      get: {
        tags: ['Member'],
        summary: '取得目前使用者的收藏清單',
        security: [{bearerAuth: []}],
        responses: {
          200: {description: '收藏陣列', content: {'application/json': {schema: {type: 'array', items: {$ref: '#/components/schemas/Favorite'}}}}},
          401: {description: '未登入或 Token 無效', content: {'application/json': {schema: {$ref: '#/components/schemas/Error'}}}},
        },
      },
    },
    '/api/favorites/{spotId}': {
      post: {
        tags: ['Member'],
        summary: '新增收藏',
        security: [{bearerAuth: []}],
        parameters: [{name: 'spotId', in: 'path', required: true, schema: {type: 'string'}}],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['spotName'],
                properties: {spotName: {type: 'string'}, pictureUrl: {type: 'string'}},
              },
            },
          },
        },
        responses: {
          201: {description: '已收藏', content: {'application/json': {schema: {$ref: '#/components/schemas/Favorite'}}}},
          400: {description: '缺少 spotName', content: {'application/json': {schema: {$ref: '#/components/schemas/Error'}}}},
          401: {description: '未登入或 Token 無效', content: {'application/json': {schema: {$ref: '#/components/schemas/Error'}}}},
        },
      },
      delete: {
        tags: ['Member'],
        summary: '取消收藏',
        security: [{bearerAuth: []}],
        parameters: [{name: 'spotId', in: 'path', required: true, schema: {type: 'string'}}],
        responses: {
          204: {description: '已取消收藏'},
          401: {description: '未登入或 Token 無效', content: {'application/json': {schema: {$ref: '#/components/schemas/Error'}}}},
        },
      },
    },
    '/api/reviews/{spotId}': {
      get: {
        tags: ['Review'],
        summary: '取得該景點評論列表',
        parameters: [{name: 'spotId', in: 'path', required: true, schema: {type: 'string'}}],
        responses: {
          200: {description: '評論陣列', content: {'application/json': {schema: {type: 'array', items: {$ref: '#/components/schemas/Review'}}}}},
        },
      },
      post: {
        tags: ['Review'],
        summary: '新增評論',
        security: [{bearerAuth: []}],
        parameters: [{name: 'spotId', in: 'path', required: true, schema: {type: 'string'}}],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['rating', 'content'],
                properties: {
                  rating: {type: 'integer', minimum: 1, maximum: 5},
                  content: {type: 'string'},
                },
              },
            },
          },
        },
        responses: {
          201: {description: '已新增', content: {'application/json': {schema: {$ref: '#/components/schemas/Review'}}}},
          400: {description: '缺少或不合法的欄位', content: {'application/json': {schema: {$ref: '#/components/schemas/Error'}}}},
          401: {description: '未登入或 Token 無效', content: {'application/json': {schema: {$ref: '#/components/schemas/Error'}}}},
        },
      },
    },
    '/api/reviews/{spotId}/{reviewId}': {
      patch: {
        tags: ['Review'],
        summary: '編輯自己的評論',
        security: [{bearerAuth: []}],
        parameters: [
          {name: 'spotId', in: 'path', required: true, schema: {type: 'string'}},
          {name: 'reviewId', in: 'path', required: true, schema: {type: 'string'}},
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['rating', 'content'],
                properties: {
                  rating: {type: 'integer', minimum: 1, maximum: 5},
                  content: {type: 'string'},
                },
              },
            },
          },
        },
        responses: {
          200: {description: '已更新', content: {'application/json': {schema: {$ref: '#/components/schemas/Review'}}}},
          403: {description: '不是自己的評論', content: {'application/json': {schema: {$ref: '#/components/schemas/Error'}}}},
          404: {description: '評論不存在', content: {'application/json': {schema: {$ref: '#/components/schemas/Error'}}}},
        },
      },
      delete: {
        tags: ['Review'],
        summary: '刪除自己的評論',
        security: [{bearerAuth: []}],
        parameters: [
          {name: 'spotId', in: 'path', required: true, schema: {type: 'string'}},
          {name: 'reviewId', in: 'path', required: true, schema: {type: 'string'}},
        ],
        responses: {
          204: {description: '已刪除'},
          403: {description: '不是自己的評論', content: {'application/json': {schema: {$ref: '#/components/schemas/Error'}}}},
          404: {description: '評論不存在', content: {'application/json': {schema: {$ref: '#/components/schemas/Error'}}}},
        },
      },
    },
```

Finally, update the `components` object to register the new schemas and the security scheme:

```javascript
  components: {
    securitySchemes: {
      bearerAuth: {type: 'http', scheme: 'bearer', bearerFormat: 'Firebase ID Token'},
    },
    schemas: {
      ScenicSpot: scenicSpotSchema,
      Error: errorSchema,
      Favorite: favoriteSchema,
      Review: reviewSchema,
    },
  },
```

- [ ] **Step 2: Re-add a fixed path-count assertion to `server/app.test.js`**

In the `GET /api/openapi.json` test, add this assertion line after `assert.ok(body.paths['/api/scenic-spots'])`:

```javascript
  assert.equal(Object.keys(body.paths).length, 11)
```

(6 original path keys + `/api/auth/me`, `/api/favorites`, `/api/favorites/{spotId}`, `/api/reviews/{spotId}`, `/api/reviews/{spotId}/{reviewId}` = 11.)

- [ ] **Step 3: Run the full backend suite**

Run: `cd server && npm test`
Expected: PASS.

- [ ] **Step 4: Manually verify Swagger UI renders correctly**

Run: `cd server && npm start`, then open `http://localhost:3000/api-docs` in a browser. Expected: `Member` and `Review` tag groups appear with the 6 new endpoints, and clicking "Try it out" on `/api/reviews/{spotId}` GET works without needing auth. (This will fail to fully start without `FIREBASE_SERVICE_ACCOUNT_JSON` set from Task 1 — if it's not set yet, skip this manual check and revisit after Task 1 is complete.)

- [ ] **Step 5: Commit**

```bash
git add server/openapi.js server/app.test.js
git commit -m "docs: document favorites and reviews endpoints in OpenAPI spec"
```

---

## Task 7: Frontend Firebase client initialization

**Files:**
- Create: `src/firebase.js`
- Modify: `package.json` (add `firebase` dependency)
- Modify: `.env.production` (add placeholder Firebase keys — actual values come from Task 1 Step 6, set as CI/deploy secrets, not committed)

**Interfaces:**
- Produces: `firebaseAuth` (Firebase Auth instance) and `googleProvider` (a `GoogleAuthProvider` instance) named exports from `src/firebase.js`, consumed by Task 8's `authStore.js`.

- [ ] **Step 1: Install `firebase`**

```bash
npm install firebase
```

- [ ] **Step 2: Create `src/firebase.js`**

```javascript
import {initializeApp} from 'firebase/app'
import {getAuth, GoogleAuthProvider} from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const firebaseApp = initializeApp(firebaseConfig)

export const firebaseAuth = getAuth(firebaseApp)
export const googleProvider = new GoogleAuthProvider()
```

- [ ] **Step 3: Add placeholder keys to `.env.production`**

Append to `.env.production`:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

(Blank on purpose — real values are set as deploy-time secrets per Task 1 Step 6, never committed. Local dev reads from the gitignored `.env` created in Task 1 Step 6.)

- [ ] **Step 4: Manually verify the dev server still boots**

Run: `npm run dev`
Expected: Vite starts without import errors (module resolves even with empty env values — Firebase SDK doesn't validate config until an auth call is made).

- [ ] **Step 5: Commit**

```bash
git add src/firebase.js package.json package-lock.json .env.production
git commit -m "feat: initialize Firebase client SDK"
```

---

## Task 8: `authStore` (Pinia)

**Files:**
- Create: `src/store/authStore.js`

**Interfaces:**
- Consumes: `firebaseAuth`, `googleProvider` from `src/firebase.js` (Task 7).
- Produces: `useAuthStore()` exposing `{user, isAuthReady, loginWithEmail(email, password), registerWithEmail(email, password), loginWithGoogle(), logout()}`. `user` is `ref(null | FirebaseUser)`. Consumed by Task 9 (axios interceptors), Task 10 (router guard), Task 11 (LoginView), Task 13 (favoriteStore/card.vue), Task 14 (Header/MyJourneyView), Task 15 (reviewStore).

- [ ] **Step 1: Create `src/store/authStore.js`**

```javascript
import {defineStore} from 'pinia'
import {ref} from 'vue'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import {firebaseAuth, googleProvider} from '@/firebase.js'

const authErrorMessages = {
  'auth/email-already-in-use': '這個 Email 已經被註冊過了',
  'auth/invalid-email': 'Email 格式不正確',
  'auth/weak-password': '密碼強度不足，至少需要 6 個字元',
  'auth/wrong-password': '密碼錯誤',
  'auth/user-not-found': '找不到這個帳號',
  'auth/invalid-credential': '帳號或密碼錯誤',
  'auth/popup-closed-by-user': 'Google 登入視窗已關閉',
}

const toMessage = e => authErrorMessages[e.code] || '發生錯誤，請稍後再試'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const isAuthReady = ref(false)

  onAuthStateChanged(firebaseAuth, firebaseUser => {
    user.value = firebaseUser
    isAuthReady.value = true
  })

  const loginWithEmail = async (email, password) => {
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password)
      return true
    } catch (e) {
      console.error(e)
      alert(toMessage(e))
      return false
    }
  }

  const registerWithEmail = async (email, password) => {
    try {
      await createUserWithEmailAndPassword(firebaseAuth, email, password)
      return true
    } catch (e) {
      console.error(e)
      alert(toMessage(e))
      return false
    }
  }

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(firebaseAuth, googleProvider)
      return true
    } catch (e) {
      console.error(e)
      alert(toMessage(e))
      return false
    }
  }

  const logout = async () => {
    await signOut(firebaseAuth)
  }

  return {user, isAuthReady, loginWithEmail, registerWithEmail, loginWithGoogle, logout}
})
```

- [ ] **Step 2: Manually verify the store initializes without errors**

Run: `npm run dev`, open the app in a browser, open devtools console. Expected: no thrown errors on page load (Firebase Auth SDK initializes and `onAuthStateChanged` fires once with `null` even without real Firebase keys configured yet — full login flow can't be tested until Task 1's real keys are in `.env`).

- [ ] **Step 3: Commit**

```bash
git add src/store/authStore.js
git commit -m "feat: add authStore for Firebase email/password and Google login"
```

---

## Task 9: Axios interceptors + favorites/reviews API functions

**Files:**
- Modify: `src/api/index.js`

**Interfaces:**
- Consumes: `useAuthStore` from Task 8 (imported lazily inside the interceptor to avoid a circular import at module-load time, since `authStore.js` doesn't import `api/index.js` so this is safe either way — using a direct top-level import).
- Produces: `getFavoritesApi()`, `addFavoriteApi(spotId, {spotName, pictureUrl})`, `removeFavoriteApi(spotId)`, `getReviewsApi(spotId)`, `addReviewApi(spotId, {rating, content})`, `updateReviewApi(spotId, reviewId, {rating, content})`, `deleteReviewApi(spotId, reviewId)` — consumed by Task 12 (`favoriteStore.js`) and Task 15 (`reviewStore.js`).

- [ ] **Step 1: Rewrite `src/api/index.js`**

```javascript
import axios from 'axios'
import {useAuthStore} from '@/store/authStore.js'
import router from '@/router/index.js'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
})

api.interceptors.request.use(async config => {
  const authStore = useAuthStore()
  if (authStore.user) {
    const token = await authStore.user.getIdToken()
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      router.push('/login')
    }
    return Promise.reject(error)
  },
)

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

export const getFavoritesApi = () =>
  api.get('/favorites').then(res => res.data)

export const addFavoriteApi = (spotId, {spotName, pictureUrl}) =>
  api.post(`/favorites/${spotId}`, {spotName, pictureUrl}).then(res => res.data)

export const removeFavoriteApi = spotId =>
  api.delete(`/favorites/${spotId}`).then(res => res.data)

export const getReviewsApi = spotId =>
  api.get(`/reviews/${spotId}`).then(res => res.data)

export const addReviewApi = (spotId, {rating, content}) =>
  api.post(`/reviews/${spotId}`, {rating, content}).then(res => res.data)

export const updateReviewApi = (spotId, reviewId, {rating, content}) =>
  api.patch(`/reviews/${spotId}/${reviewId}`, {rating, content}).then(res => res.data)

export const deleteReviewApi = (spotId, reviewId) =>
  api.delete(`/reviews/${spotId}/${reviewId}`).then(res => res.data)
```

Note: `useAuthStore()` is called inside the interceptor function body (not at module top level) because Pinia must be installed on the app (`app.use(createPinia())` in `main.js`) before any store can be instantiated — calling it lazily on each request avoids relying on import order between `main.js` and `api/index.js`.

- [ ] **Step 2: Manually verify existing scenic-spot pages still work**

Run: `npm run dev` (with backend running via `cd server && npm start` in a separate terminal), open `http://localhost:5173`, browse the home page and 找景點 list. Expected: existing behavior unchanged — spots load normally (unauthenticated requests simply don't get an `Authorization` header, per the `if (authStore.user)` guard).

- [ ] **Step 3: Commit**

```bash
git add src/api/index.js
git commit -m "feat: add favorites/reviews API functions and auth token interceptor"
```

---

## Task 10: Router — `/login`, `/my-journey`, and auth guard

**Files:**
- Modify: `src/router/index.js`
- Create: `src/views/LoginView.vue` (placeholder — full implementation in Task 11; created here as an empty shell so the route resolves)

**Interfaces:**
- Consumes: `useAuthStore` from Task 8.
- Produces: named routes `login` and `myJourney` with `meta.requiresAuth`, consumed by Task 14 (`Header.vue` links to them by name).

- [ ] **Step 1: Create a minimal `src/views/LoginView.vue` shell**

```vue
<script setup></script>

<template>
  <div class="max-w-[400px] mx-auto py-10 px-6">
    <h1 class="text-[24px] font-700 text-[#434343]">登入 / 註冊</h1>
  </div>
</template>
```

(Full form is built in Task 11 — this shell exists now purely so the route has a valid component to render.)

- [ ] **Step 2: Create a minimal `src/views/MyJourneyView.vue` shell**

```vue
<script setup></script>

<template>
  <div class="max-w-[600px] mx-auto py-10 px-6">
    <h1 class="text-[24px] font-700 text-[#434343]">我的旅程</h1>
  </div>
</template>
```

(Full profile + favorites list is built in Task 13.)

- [ ] **Step 3: Modify `src/router/index.js`**

```javascript
import {createRouter, createWebHistory} from 'vue-router'

import Home from '../views/HomeView.vue'
import viewList from '../views/viewList.vue'
import viewPoint from '../page/viewPoint.vue'
import LoginView from '../views/LoginView.vue'
import MyJourneyView from '../views/MyJourneyView.vue'
import {useAuthStore} from '@/store/authStore.js'

const path = process.env.NODE_ENV === 'production' ? '/travelTaiwan/' : ''

const router = createRouter({
  history: createWebHistory(path),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
    },
    {
      path: '/viewList',
      name: 'viewList',
      component: viewList,
    },
    {
      path: '/viewList/:id',
      name: 'viewPoint',
      component: viewPoint,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/my-journey',
      name: 'myJourney',
      component: MyJourneyView,
      meta: {requiresAuth: true},
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: {name: 'home'},
    },
  ],
  scrollBehavior() {
    // always scroll to top
    return {top: 0}
  },
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true
  const authStore = useAuthStore()
  if (!authStore.isAuthReady) {
    await new Promise(resolve => {
      const unwatch = authStore.$subscribe(() => {
        if (authStore.isAuthReady) {
          unwatch()
          resolve()
        }
      })
    })
  }
  if (!authStore.user) {
    return {name: 'login', query: {redirect: to.fullPath}}
  }
  return true
})

export default router
```

- [ ] **Step 4: Manually verify routing**

Run: `npm run dev`, navigate to `http://localhost:5173/my-journey` directly in the URL bar while logged out. Expected: redirected to `/login?redirect=%2Fmy-journey`. Navigate to `http://localhost:5173/login`. Expected: the shell page renders without error.

- [ ] **Step 5: Commit**

```bash
git add src/router/index.js src/views/LoginView.vue src/views/MyJourneyView.vue
git commit -m "feat: add /login and /my-journey routes with auth guard"
```

---

## Task 11: `LoginView.vue` — Email/密碼 + Google 登入表單

**Files:**
- Modify: `src/views/LoginView.vue` (replace shell from Task 10 with full implementation)

**Interfaces:**
- Consumes: `useAuthStore` (`loginWithEmail`, `registerWithEmail`, `loginWithGoogle`) from Task 8.

- [ ] **Step 1: Implement `src/views/LoginView.vue`**

```vue
<script setup>
import {ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {useAuthStore} from '@/store/authStore.js'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const mode = ref('login') // 'login' | 'register'
const email = ref('')
const password = ref('')
const submitting = ref(false)

const redirectAfterLogin = () => {
  const target = typeof route.query.redirect === 'string' ? route.query.redirect : '/my-journey'
  router.push(target)
}

const submit = async () => {
  submitting.value = true
  const ok = mode.value === 'login'
    ? await authStore.loginWithEmail(email.value, password.value)
    : await authStore.registerWithEmail(email.value, password.value)
  submitting.value = false
  if (ok) redirectAfterLogin()
}

const submitGoogle = async () => {
  submitting.value = true
  const ok = await authStore.loginWithGoogle()
  submitting.value = false
  if (ok) redirectAfterLogin()
}
</script>

<template>
  <div class="max-w-[400px] mx-auto py-10 px-6">
    <h1 class="text-[24px] font-700 text-[#434343] mb-6">
      {{ mode === 'login' ? '登入' : '註冊' }}
    </h1>

    <form class="grid gap-4" @submit.prevent="submit">
      <input
        v-model="email"
        type="email"
        required
        placeholder="Email"
        class="rounded-[8px] border-1 border-solid border-[#eee] py-2 px-4"
      />
      <input
        v-model="password"
        type="password"
        required
        minlength="6"
        placeholder="密碼（至少 6 碼）"
        class="rounded-[8px] border-1 border-solid border-[#eee] py-2 px-4"
      />
      <button
        type="submit"
        :disabled="submitting"
        class="btn-secondary py-3 rounded-[62px] bg-[#1FB588] text-white font-700"
      >
        {{ mode === 'login' ? '登入' : '註冊' }}
      </button>
    </form>

    <button
      class="mt-3 w-full py-3 rounded-[62px] border-1 border-solid border-[#1Fb588] text-[#616161] font-700"
      :disabled="submitting"
      @click="submitGoogle"
    >
      使用 Google 登入
    </button>

    <p class="mt-4 text-center text-[#808080]">
      <button
        type="button"
        class="underline"
        @click="mode = mode === 'login' ? 'register' : 'login'"
      >
        {{ mode === 'login' ? '還沒有帳號？註冊' : '已經有帳號？登入' }}
      </button>
    </p>
  </div>
</template>
```

- [ ] **Step 2: Manually verify login flow end-to-end**

Prerequisite: Task 1 completed (real Firebase keys in `.env`), backend running with `FIREBASE_SERVICE_ACCOUNT_JSON` set. Run `npm run dev` and `cd server && npm start`. In the browser:
1. Go to `/login`, register a new test account with a real-looking email + password ≥6 chars. Expected: redirected to `/my-journey` after success, and the Firebase Console → Authentication → Users tab shows the new user.
2. Log out (no UI for this yet — Task 13 adds it; for now verify via devtools: `useAuthStore().logout()` from console, or skip to Task 13 first if preferred).
3. Log back in with the same email/password. Expected: succeeds, redirects to `/my-journey`.
4. Click "使用 Google 登入". Expected: a Google popup appears, after choosing an account it closes and redirects to `/my-journey`.

- [ ] **Step 3: Commit**

```bash
git add src/views/LoginView.vue
git commit -m "feat: implement email/password and Google login form"
```

---

## Task 12: `favoriteStore` (Pinia)

**Files:**
- Create: `src/store/favoriteStore.js`

**Interfaces:**
- Consumes: `getFavoritesApi`, `addFavoriteApi`, `removeFavoriteApi` from Task 9; `useAuthStore` from Task 8.
- Produces: `useFavoriteStore()` exposing `{favoriteIds: Set<string> (ref), favoriteList (ref), fetchFavorites(), toggleFavorite(spot)}` where `spot` is `{id, title, photoSrc}` (matches `cardData` shape from `processList.js`). Consumed by Task 13 (`card.vue`, `MyJourneyView.vue`) and Task 15 (`viewPoint.vue`'s standalone heart icon).

- [ ] **Step 1: Create `src/store/favoriteStore.js`**

```javascript
import {defineStore} from 'pinia'
import {ref} from 'vue'
import {getFavoritesApi, addFavoriteApi, removeFavoriteApi} from '@/api/index.js'

export const useFavoriteStore = defineStore('favorite', () => {
  const favoriteIds = ref(new Set())
  const favoriteList = ref([])

  const fetchFavorites = async () => {
    try {
      const data = await getFavoritesApi()
      favoriteList.value = data
      favoriteIds.value = new Set(data.map(f => f.spotId))
    } catch (e) {
      console.error(e)
    }
  }

  const toggleFavorite = async spot => {
    const isFavorited = favoriteIds.value.has(spot.id)

    if (isFavorited) {
      favoriteIds.value.delete(spot.id)
      favoriteIds.value = new Set(favoriteIds.value)
      try {
        await removeFavoriteApi(spot.id)
        favoriteList.value = favoriteList.value.filter(f => f.spotId !== spot.id)
      } catch (e) {
        console.error(e)
        favoriteIds.value.add(spot.id)
        favoriteIds.value = new Set(favoriteIds.value)
        alert('取消收藏失敗，請稍後再試')
      }
      return
    }

    favoriteIds.value.add(spot.id)
    favoriteIds.value = new Set(favoriteIds.value)
    try {
      const photoSrc = Array.isArray(spot.photoSrc) ? spot.photoSrc[0] : spot.photoSrc
      const saved = await addFavoriteApi(spot.id, {spotName: spot.title, pictureUrl: photoSrc})
      favoriteList.value = [saved, ...favoriteList.value]
    } catch (e) {
      console.error(e)
      favoriteIds.value.delete(spot.id)
      favoriteIds.value = new Set(favoriteIds.value)
      alert('收藏失敗，請稍後再試')
    }
  }

  return {favoriteIds, favoriteList, fetchFavorites, toggleFavorite}
})
```

- [ ] **Step 2: Manually verify via devtools (UI wiring comes in Task 13)**

With backend + real Firebase running and a logged-in session (from Task 11), open devtools console on any page and run:

```js
const s = window.__VUE_DEVTOOLS_GLOBAL_HOOK__ // skip if devtools unavailable; alternative below
```

Simpler: temporarily add `console.log(await useFavoriteStore().toggleFavorite({id: 'test-spot', title: 'Test', photoSrc: ['x.jpg']}))` isn't directly runnable from console without store access — instead, defer full verification to Task 13 Step 3 where the UI exists. For this task, just confirm no import/syntax errors:

Run: `npm run dev`
Expected: dev server starts cleanly, no console errors on any page load (store isn't used yet, so this mainly checks for typos).

- [ ] **Step 3: Commit**

```bash
git add src/store/favoriteStore.js
git commit -m "feat: add favoriteStore for optimistic favorite toggling"
```

---

## Task 13: Wire the heart icon in `card.vue`

**Files:**
- Create: `src/assets/images/icon/heart-filled.svg`
- Modify: `src/components/card.vue`

**Interfaces:**
- Consumes: `useFavoriteStore` from Task 12, `useAuthStore` from Task 8.

- [ ] **Step 1: Create `src/assets/images/icon/heart-filled.svg`**

```xml
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M16 27.9344L15.2594 27.4594C15.1375 27.3844 12.2687 25.5344 9.36562 22.8563C7.31875 20.9656 5.7 19.15 4.55312 17.4594C3.11562 15.3406 2.5 13.3781 2.5 12.0469C2.5 8.19064 5.90312 3.90627 10.7594 3.90627C13.0437 3.90627 15.025 5.18127 16 7.04377C16.975 5.18127 18.9563 3.90627 21.2406 3.90627C26.0969 3.90627 29.5 8.19064 29.5 12.0469C29.5 13.3781 28.8844 15.3406 27.4469 17.4594C26.3 19.15 24.6812 20.9656 22.6344 22.8563C19.7313 25.5344 16.8625 27.3844 16.7406 27.4594L16 27.9344Z" fill="#1FB588"/>
</svg>
```

- [ ] **Step 2: Modify `src/components/card.vue`**

```vue
<script setup>
import satisfaction from "../components/satisfaction.vue";
import heartOutline from "../assets/images/icon/heart-outline.svg";
import heartFilled from "../assets/images/icon/heart-filled.svg";
import { computed } from "vue";
import { useRouter } from "vue-router";
import { getImagePath } from "@/common/useImage";
import { useAuthStore } from "@/store/authStore.js";
import { useFavoriteStore } from "@/store/favoriteStore.js";

const props = defineProps({
  cardData: {
    type: Object,
  },
});
const cardData = computed(() => props.cardData);

const router = useRouter();
const authStore = useAuthStore();
const favoriteStore = useFavoriteStore();

const isFavorited = computed(() => favoriteStore.favoriteIds.has(cardData.value.id));
const favoriteIcon = computed(() => (isFavorited.value ? heartFilled : heartOutline));

const onHeartClick = () => {
  if (!authStore.user) {
    router.push({name: "login"});
    return;
  }
  favoriteStore.toggleFavorite(cardData.value);
};
</script>

<template>
  <div class="card shadow024 px-6 pt-5 pb-6 rounded-8px lg:flex-shrink-0">
    <div class="relative inline-block mb-2">
      <img
        :src="getImagePath(cardData.photoSrc)"
        class="object-cover w-[274px] h-[168px]"
      />
      <div
        class="absolute top-2 right-2 flex items-center justify-center w-10 h-10 bg-white border-[#28DAA5] rounded-full border-1 border-solid cursor-pointer"
        @click="onHeartClick"
      >
        <img :src="favoriteIcon" alt="heart" />
      </div>
    </div>
    <h3 class="pb-1 text-[#434343] text-[24px] font-700 truncate">
      {{ cardData.title }}
    </h3>
    <satisfaction :startNum="cardData.startNum"></satisfaction>
    <div class="pt-2 gap-2 flex min-h-[36px]">
      <button v-for="(tag, index) in cardData.tagText" :key="index" class="tag">
        {{ tag }}
      </button>
    </div>
  </div>
</template>

<style>
.card {
  max-width: 300px;
}
.shadow024 {
  box-shadow: 0px 4px 10px 0px #80808033;
}
</style>
```

- [ ] **Step 3: Manually verify**

With backend + real Firebase running: log in (Task 11), navigate to `/viewList`. Click a card's heart icon. Expected: icon switches to filled green heart immediately (optimistic update), and Firebase Console → Firestore Database shows a new document under `favorites/{your-uid}/spots/{spotId}`. Click it again. Expected: icon reverts to outline, Firestore document is deleted. Log out and click a heart on any card. Expected: redirected to `/login`.

- [ ] **Step 4: Commit**

```bash
git add src/assets/images/icon/heart-filled.svg src/components/card.vue
git commit -m "feat: wire favorite heart icon on scenic spot cards"
```

---

## Task 14: `MyJourneyView.vue` + `Header.vue` wiring

**Files:**
- Modify: `src/views/MyJourneyView.vue` (replace shell from Task 10)
- Modify: `src/components/Header.vue`

**Interfaces:**
- Consumes: `useAuthStore` (Task 8), `useFavoriteStore` (Task 12).

- [ ] **Step 1: Implement `src/views/MyJourneyView.vue`**

```vue
<script setup>
import {onMounted} from "vue";
import {useRouter} from "vue-router";
import card from "@/components/card.vue";
import {useAuthStore} from "@/store/authStore.js";
import {useFavoriteStore} from "@/store/favoriteStore.js";

const authStore = useAuthStore();
const favoriteStore = useFavoriteStore();
const router = useRouter();

onMounted(() => {
  favoriteStore.fetchFavorites();
});

const logout = async () => {
  await authStore.logout();
  router.push({name: "home"});
};

const toCardData = fav => ({
  id: fav.spotId,
  title: fav.spotName,
  photoSrc: [fav.pictureUrl].filter(Boolean),
  tagText: [],
  startNum: 0,
});
</script>

<template>
  <div class="max-w-[1000px] mx-auto py-10 px-6">
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-4">
        <img
          v-if="authStore.user?.photoURL"
          :src="authStore.user.photoURL"
          class="w-14 h-14 rounded-full"
          alt="avatar"
        />
        <div v-else class="w-14 h-14 rounded-full bg-[#1FB588]"></div>
        <div>
          <p class="font-700 text-[18px] text-[#434343]">
            {{ authStore.user?.displayName || "旅人" }}
          </p>
          <p class="text-[#808080]">{{ authStore.user?.email }}</p>
        </div>
      </div>
      <button
        class="py-2 px-5 rounded-[62px] border-1 border-solid border-[#1Fb588] text-[#616161] font-700"
        @click="logout"
      >
        登出
      </button>
    </div>

    <h2 class="text-[20px] font-700 text-[#434343] mb-4">我的收藏</h2>
    <p v-if="favoriteStore.favoriteList.length === 0" class="text-[#808080]">
      還沒有收藏任何景點，去
      <router-link :to="{name: 'viewList'}" class="text-[#1FB588] underline">找景點</router-link>
      看看吧！
    </p>
    <div v-else class="flex flex-wrap gap-4">
      <router-link
        v-for="fav in favoriteStore.favoriteList"
        :key="fav.spotId"
        :to="`/viewList/${fav.spotId}`"
      >
        <card :cardData="toCardData(fav)"></card>
      </router-link>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Modify `src/components/Header.vue`**

Add imports and store access at the top of `<script setup>`:

```javascript
import { useAuthStore } from "@/store/authStore";
const authStore = useAuthStore();
```

(Insert this right after the existing `homeViewStore` lines.)

Replace the dead `我的旅程` link:

```vue
          <li>
            <a
              href="#"
              class="flex gap-x-2 py-3 px-5 rounded-[62px] font-500 text-[#fff] bg-[#1FB588] hover:bg-[#588E6B]"
            >
              我的旅程
            </a>
          </li>
```

with:

```vue
          <li>
            <router-link
              :to="authStore.user ? { name: 'myJourney' } : { name: 'login' }"
              class="flex gap-x-2 py-3 px-5 rounded-[62px] font-500 text-[#fff] bg-[#1FB588] hover:bg-[#588E6B]"
            >
              {{ authStore.user ? "我的旅程" : "登入" }}
            </router-link>
          </li>
```

- [ ] **Step 3: Manually verify**

Logged out: header shows "登入" pill, clicking it goes to `/login`. Log in, then click the now-"我的旅程" pill: expected to land on `/my-journey` showing your email, avatar (if Google login), and any favorites clicked in Task 13 rendered as cards. Click "登出": expected to return to home page and header pill reverts to "登入".

- [ ] **Step 4: Commit**

```bash
git add src/views/MyJourneyView.vue src/components/Header.vue
git commit -m "feat: implement my-journey profile page and header auth link"
```

---

## Task 15: `reviewStore` (Pinia)

**Files:**
- Create: `src/store/reviewStore.js`

**Interfaces:**
- Consumes: `getReviewsApi`, `addReviewApi`, `updateReviewApi`, `deleteReviewApi` from Task 9.
- Produces: `useReviewStore()` exposing `{reviews (ref array), fetchReviews(spotId), addReview(spotId, {rating, content}), updateReview(spotId, reviewId, {rating, content}), deleteReview(spotId, reviewId)}`. Consumed by Task 16 (`viewPoint.vue`).

- [ ] **Step 1: Create `src/store/reviewStore.js`**

```javascript
import {defineStore} from 'pinia'
import {ref} from 'vue'
import {
  getReviewsApi,
  addReviewApi,
  updateReviewApi,
  deleteReviewApi,
} from '@/api/index.js'

export const useReviewStore = defineStore('review', () => {
  const reviews = ref([])

  const fetchReviews = async spotId => {
    try {
      reviews.value = await getReviewsApi(spotId)
    } catch (e) {
      console.error(e)
    }
  }

  const addReview = async (spotId, {rating, content}) => {
    try {
      const created = await addReviewApi(spotId, {rating, content})
      reviews.value = [created, ...reviews.value]
      return true
    } catch (e) {
      console.error(e)
      alert('送出評論失敗，請稍後再試')
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

  return {reviews, fetchReviews, addReview, updateReview, deleteReview}
})
```

- [ ] **Step 2: Manually verify no import errors**

Run: `npm run dev`
Expected: dev server starts cleanly (store isn't used in the UI yet — that's Task 16).

- [ ] **Step 3: Commit**

```bash
git add src/store/reviewStore.js
git commit -m "feat: add reviewStore for fetching and mutating spot reviews"
```

---

## Task 16: `StarRatingInput.vue` + wire reviews into `viewPoint.vue`

**Files:**
- Create: `src/components/StarRatingInput.vue`
- Modify: `src/page/viewPoint.vue`

**Interfaces:**
- Consumes: `useReviewStore` (Task 15), `useAuthStore` (Task 8), `useFavoriteStore` + `useAuthStore` for the page's standalone heart icon (Tasks 12, 8).
- Produces: `StarRatingInput` component with `modelValue: Number` prop (`v-model` compatible, 1–5), emits `update:modelValue`.

- [ ] **Step 1: Create `src/components/StarRatingInput.vue`**

```vue
<script setup>
import starFilled from "../assets/images/icon/star-filled.svg";
import starOutline from "../assets/images/icon/star-outline.svg";

const props = defineProps({
  modelValue: {type: Number, default: 0},
});
const emit = defineEmits(["update:modelValue"]);
</script>

<template>
  <div class="flex gap-1">
    <button
      v-for="n in 5"
      :key="n"
      type="button"
      @click="emit('update:modelValue', n)"
    >
      <img :src="n <= modelValue ? starFilled : starOutline" alt="star" class="w-6 h-6" />
    </button>
  </div>
</template>
```

- [ ] **Step 2: Modify `src/page/viewPoint.vue`**

Update the `<script setup>` block — add imports and review/favorite wiring:

```javascript
import { computed, onMounted, ref, watch } from "vue";
import card from "../components/card.vue";
import satisfaction from "../components/satisfaction.vue";
import ArticleToggle from "../components/ArticleToggle.vue";
import StarRatingInput from "../components/StarRatingInput.vue";
import { useRoute, useRouter } from "vue-router";

import { getImagePath } from "@/common/useImage";
import { storeToRefs } from "pinia";
import { useHomeViewStore } from "@/store/homeViewStore";
import { useAuthStore } from "@/store/authStore";
import { useFavoriteStore } from "@/store/favoriteStore";
import { useReviewStore } from "@/store/reviewStore";
import processViewData from "@/common/processList.js";
import { getViewByIdApi } from "@/api/index.js";

const homeViewStore = useHomeViewStore();
const { randomThreeItems } = storeToRefs(homeViewStore);
const { refreshRandomItems } = homeViewStore;

const authStore = useAuthStore();
const favoriteStore = useFavoriteStore();
const reviewStore = useReviewStore();
const router = useRouter();

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
reviewStore.fetchReviews(viewListId.value);

const isFavorited = computed(() =>
  renderViewData.value ? favoriteStore.favoriteIds.has(renderViewData.value.id) : false
);

const toggleFavoriteOnPage = () => {
  if (!authStore.user) {
    router.push({ name: "login" });
    return;
  }
  favoriteStore.toggleFavorite(renderViewData.value);
};

const averageRating = computed(() => {
  if (reviewStore.reviews.length === 0) return 0;
  const sum = reviewStore.reviews.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / reviewStore.reviews.length) * 10) / 10;
});

const newReviewRating = ref(0);
const newReviewContent = ref("");

const submitReview = async () => {
  if (newReviewRating.value === 0) {
    alert("請選擇星等");
    return;
  }
  if (!newReviewContent.value.trim()) {
    alert("請輸入評論內容");
    return;
  }
  const ok = await reviewStore.addReview(viewListId.value, {
    rating: newReviewRating.value,
    content: newReviewContent.value,
  });
  if (ok) {
    newReviewRating.value = 0;
    newReviewContent.value = "";
  }
};

const editingReviewId = ref(null);
const editRating = ref(0);
const editContent = ref("");

const startEdit = (review) => {
  editingReviewId.value = review.id;
  editRating.value = review.rating;
  editContent.value = review.content;
};

const cancelEdit = () => {
  editingReviewId.value = null;
};

const saveEdit = async (reviewId) => {
  const ok = await reviewStore.updateReview(viewListId.value, reviewId, {
    rating: editRating.value,
    content: editContent.value,
  });
  if (ok) editingReviewId.value = null;
};

const removeReview = async (reviewId) => {
  if (!confirm("確定要刪除這則評論嗎？")) return;
  await reviewStore.deleteReview(viewListId.value, reviewId);
};

const noServe = () => {
  alert("此服務尚未開啟,敬請期待");
};

const moveToNewViewPoint = (id) => {
  viewListId.value = id;
  loadViewData(id);
  refreshRandomItems();
  reviewStore.fetchReviews(id);
};
```

Remove the old hardcoded `commitList` ref entirely (delete these lines from the original file):

```javascript
const commitList = ref([
  {
    title: "不錯的景點",
    txt: "風景好視野開闊，看海看山看夕陽。黃昏時分人潮眾多。休閒放鬆的好去處。",
  },
  {
    title: "悠閒放鬆的好地方",
    txt: "若有閒暇時間，非常適合放慢腳步，坐於岸邊品嚐各式美食，享受一下晝與夜的美景。",
  },
  {
    title: "人潮多，避開人群",
    txt: "建議平日造訪，假日太多人，旅遊品質會下降。平日早訪，會有比較好的旅遊品質",
  },
]);
```

Add these two imports near the top of `<script setup>` (with the other imports, this project uses Vite so static ES imports are required — no `require()`):

```javascript
import heartOutline from "../assets/images/icon/heart-outline.svg";
import heartFilled from "../assets/images/icon/heart-filled.svg";
```

In the `<template>`, replace the standalone heart icon (currently non-interactive, around the top action icons):

```vue
          <div
            class="flex items-center justify-center w-[30px] h-[30px] rounded-full border-1 border-solid border-[#1Fb588]"
          >
            <img
              src="../assets/images/icon/heart-outline.svg"
              alt="heart"
              class="w-[18px]"
            />
          </div>
```

with:

```vue
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
```

Replace the entire `<!-- 評價 -->` block (from `<div class="mt-5">` through its matching closing `</div>` that contains the hardcoded `commitList` loop and the "查看更多" button — everything currently between the 服務設施 section and the "這些景點大家也推薦" section) with:

```vue
      <!-- 評價 -->
      <div class="mt-5">
        <div>
          <h4 class="text-[#188E6B] font-700 text-[24px] pb-4 md:text-[32px]">
            旅客評價
          </h4>
          <div class="flex items-center gap-2">
            <p class="text-[30px] text-[#434343] font-700">{{ averageRating || "–" }}</p>
            <satisfaction
              :startNum="Math.round(averageRating)"
              :commit="true"
              :commitNum="reviewStore.reviews.length"
            ></satisfaction>
          </div>
        </div>

        <div class="pt-6 pb-6 border-b border-b-solid border-[#eee]">
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

        <div>
          <div v-for="review in reviewStore.reviews" :key="review.id">
            <div class="pt-4 flex items-end">
              <div class="w-10 h-10 rounded-full bg-[#208080]"></div>
              <p class="ml-2 text-[18px] font-700 text-[#434343]">
                {{ review.authorName }}
              </p>
              <div class="ml-auto">
                <satisfaction :startNum="review.rating"></satisfaction>
              </div>
            </div>
            <div class="pt-4 pb-6 border-b border-b-solid border-[#eee]">
              <div v-if="editingReviewId === review.id">
                <StarRatingInput v-model="editRating" />
                <textarea
                  v-model="editContent"
                  rows="3"
                  class="w-full mt-2 rounded-[8px] border-1 border-solid border-[#eee] py-2 px-4"
                ></textarea>
                <div class="flex gap-2 mt-2">
                  <button class="btn" @click="saveEdit(review.id)">儲存</button>
                  <button class="btn-secondary" @click="cancelEdit">取消</button>
                </div>
              </div>
              <div v-else>
                <p class="leading-6">{{ review.content }}</p>
                <div v-if="authStore.user?.uid === review.uid" class="flex gap-2 mt-2">
                  <button class="text-[#1FB588] underline" @click="startEdit(review)">編輯</button>
                  <button class="text-[#EB5757] underline" @click="removeReview(review.id)">刪除</button>
                </div>
              </div>
            </div>
          </div>
          <p v-if="reviewStore.reviews.length === 0" class="text-[#808080] py-6">
            還沒有評論，成為第一個留言的人吧！
          </p>
        </div>

        <div class="pb-10">
          <h4 class="text-[#188E6B] font-700 text-[24px] pb-4 md:text-[32px]">
            這些景點大家也推薦
          </h4>
          <div
            class="flex justify-center flex-col gap-4 items-center md:grid md:grid-cols-3 md:gap-6"
          >
            <router-link
              @click="moveToNewViewPoint(data.id)"
              v-for="data in randomThreeItems"
              :key="data.id"
              :to="`${data.id}`"
            >
              <card :cardData="data"></card>
            </router-link>
          </div>
        </div>
      </div>
```

- [ ] **Step 3: Manually verify**

With backend + real Firebase running, logged in: navigate to any `/viewList/:id` page. Expected: 旅客評價 section shows "還沒有評論" initially (or seed data once Task 17 runs), average rating shows `–` when empty. Submit a review with 4 stars and text. Expected: it appears at the top of the list immediately, average rating updates. Click 編輯 on your own review, change rating/text, 儲存. Expected: updates in place. Click 刪除. Expected: removed from the list and Firestore. Log out and revisit the page: expected review list still renders (public read), but the write form is replaced by the "登入後即可留言" link, and no 編輯/刪除 buttons show on any review.

- [ ] **Step 4: Commit**

```bash
git add src/components/StarRatingInput.vue src/page/viewPoint.vue
git commit -m "feat: wire real reviews UI into scenic spot detail page"
```

---

## Task 17: Seed review data script

**Files:**
- Create: `server/scripts/seedReviews.js`
- Create: `server/scripts/seedReviewsData.js`

**Interfaces:**
- Consumes: `firebaseAdmin.js`'s `firestore` export (Task 3), `server/data/homeViewPoint.json` (existing, to look up hot spots' `ScenicSpotID`s).
- One-off script, run manually via `node server/scripts/seedReviews.js` — not part of the HTTP API surface.

- [ ] **Step 1: Identify target spot IDs**

Run this one-liner to list the `ScenicSpotID`s and names of the hot spots already featured on the home page (these are the "熱門景點" chosen in the design spec):

```bash
node -e "
const data = JSON.parse(require('fs').readFileSync('server/data/homeViewPoint.json', 'utf-8'));
const seen = new Map();
data.forEach(region => Object.values(region).forEach(spots => spots.forEach(s => seen.set(s.ScenicSpotID, s.ScenicSpotName))));
[...seen.entries()].slice(0, 15).forEach(([id, name]) => console.log(id, '—', name));
"
```

Expected: prints up to 15 `id — name` pairs. Use this exact output to fill in `spotId` values in Step 2 (do not invent IDs — they must match real entries in `allViewPoint.json`/`homeViewPoint.json` or the reviews will point at scenic spots the API can't resolve).

- [ ] **Step 2: Create `server/scripts/seedReviewsData.js`**

Structure the seed content as data, separate from the writing script. Fill in the `spotId`/`spotName` pairs using the exact output from Step 1 (the example below shows the shape with 2 sample spots — replace/extend with your actual Step 1 output for all ~15 spots):

```javascript
const nicknames = ['旅人A', '阿先', '小鹿', '晴天旅人', '愛趴趴走的貓', '山海之間', '慢步調', '背包客小陳']

const pick = i => nicknames[i % nicknames.length]

export const seedReviews = [
  {
    spotId: 'REPLACE_WITH_REAL_ID_FROM_STEP_1',
    spotName: 'REPLACE_WITH_REAL_NAME_FROM_STEP_1',
    reviews: [
      {authorName: pick(0), rating: 5, content: '景色非常漂亮，很適合全家大小一起來走走，停車也算方便。'},
      {authorName: pick(1), rating: 4, content: '假日人潮較多，建議一早前往，體驗會更好一些。'},
      {authorName: pick(2), rating: 5, content: '第一次來就被美景吸引，拍照打卡的好地方，會再訪。'},
      {authorName: pick(3), rating: 3, content: '整體不錯，但周邊指標不太清楚，第一次來容易繞路。'},
    ],
  },
  {
    spotId: 'REPLACE_WITH_REAL_ID_FROM_STEP_1',
    spotName: 'REPLACE_WITH_REAL_NAME_FROM_STEP_1',
    reviews: [
      {authorName: pick(4), rating: 4, content: '歷史氛圍濃厚，館內導覽解說很詳細，值得花時間慢慢逛。'},
      {authorName: pick(5), rating: 5, content: '展覽內容豐富，一個下午都逛不完，建議預留充足時間。'},
      {authorName: pick(6), rating: 4, content: '交通還算方便，附近也有不少小吃可以順道品嚐。'},
    ],
  },
]
```

Note for whoever runs this task: replace all `REPLACE_WITH_REAL_ID_FROM_STEP_1` / `REPLACE_WITH_REAL_NAME_FROM_STEP_1` placeholders with the real `id`/`name` pairs printed by Step 1, and extend the array to cover all ~15 spots printed there, writing 3–5 original review entries per spot in the same natural, varied style shown above (positive with a minor caveat, purely positive, practical/logistics-focused, etc. — vary the angle so they don't read as templated).

- [ ] **Step 3: Create `server/scripts/seedReviews.js`**

```javascript
import {firestore} from '../firebaseAdmin.js'
import {seedReviews} from './seedReviewsData.js'

const run = async () => {
  for (const {spotId, spotName, reviews} of seedReviews) {
    const collectionRef = firestore.collection('reviews').doc(spotId).collection('entries')
    for (const review of reviews) {
      await collectionRef.add({
        uid: null,
        authorName: review.authorName,
        rating: review.rating,
        content: review.content,
        isSeed: true,
        createdAt: new Date().toISOString(),
        updatedAt: null,
      })
    }
    console.log(`Seeded ${reviews.length} reviews for ${spotName} (${spotId})`)
  }
  console.log('Done.')
}

run().catch(e => {
  console.error(e)
  process.exit(1)
})
```

- [ ] **Step 4: Run the seed script once**

Prerequisite: `FIREBASE_SERVICE_ACCOUNT_JSON` set in `server/.env` (Task 1), and all `REPLACE_WITH_REAL_ID_FROM_STEP_1` placeholders in `seedReviewsData.js` filled in (Step 2 note).

Run: `cd server && node --env-file=.env scripts/seedReviews.js`
Expected: console prints one "Seeded N reviews for ..." line per spot, ends with "Done." Verify in Firebase Console → Firestore Database that `reviews/{spotId}/entries` documents exist with `isSeed: true`.

- [ ] **Step 5: Manually verify in the app**

Run `npm run dev` (frontend) and visit `/viewList/<one of the seeded spotIds>`. Expected: 旅客評價 section shows the seeded reviews with their nicknames, star ratings, and average rating computed correctly. No 編輯/刪除 buttons appear on seed reviews even when logged in (since `review.uid` is `null`, never equal to `authStore.user?.uid`).

- [ ] **Step 6: Commit**

```bash
git add server/scripts/seedReviews.js server/scripts/seedReviewsData.js
git commit -m "feat: add one-off script to seed sample reviews for hot spots"
```

(Do not commit `server/.env` — confirm `git status` shows it absent from the commit.)

---

## Task 18: Update README with setup instructions

**Files:**
- Modify: `README.md`

**Interfaces:** none — documentation only.

- [ ] **Step 1: Add a new section to `README.md`**, after the existing "### 雲端部署（Render/Railway）" section:

```markdown
## 會員登入、收藏、評論

新增功能需要 Firebase 專案（Authentication + Firestore）。完整設定步驟見
`docs/superpowers/specs/2026-07-09-member-auth-favorites-reviews-design.md` 與對應的
`docs/superpowers/plans/2026-07-09-member-auth-favorites-reviews.md` Task 1。

### 本機開發所需環境變數

前端 `.env`（不進版控）：

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

後端 `server/.env`（不進版控）：

```
FIREBASE_SERVICE_ACCOUNT_JSON={...Firebase 服務帳戶 JSON，單行...}
```

### 種子評論資料

首次部署後執行一次（需要 `server/.env` 設定完成）：

```bash
cd server
node --env-file=.env scripts/seedReviews.js
```
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: document Firebase setup and review seeding for new features"
```

---

## Self-Review Notes

- **Spec coverage:** Architecture (Task 2–3), data model (Task 4–5 repos), API endpoints (Task 2 routes + Task 6 docs), frontend routes/stores/components (Tasks 7–16), error handling (built into each store/route per spec), testing (Tasks 2–6 backend TDD, manual steps for frontend per spec's Non-Goals), seed reviews (Task 17). All spec sections have a corresponding task.
- **Type/interface consistency:** `favoritesRepo` shape (`list/add/remove`) and `reviewsRepo` shape (`list/add/update/remove`) are identical across Task 2 (route usage), Task 4/5 (fakes and real implementation) — verified matching parameter order and return shapes. `cardData.id`/`title`/`photoSrc` (from `processList.js`, pre-existing) is the exact shape `favoriteStore.toggleFavorite` and `card.vue`/`viewPoint.vue` pass around.
- **Placeholder scan:** no TBD/TODO left in code steps; the only intentional placeholders are `REPLACE_WITH_REAL_ID_FROM_STEP_1` in Task 17's seed data, which Step 1 of that same task generates real values for before Step 2 is executed — not a plan gap, but data that can only be known at execution time (real Firestore-facing scenic spot IDs).
