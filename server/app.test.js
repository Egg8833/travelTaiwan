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
  assert.equal(Object.keys(body.paths).length, 11)
})

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

test('GET /api-docs 提供 Swagger UI 頁面', async () => {
  const res = await fetch(base + '/api-docs/')
  assert.equal(res.status, 200)
  const html = await res.text()
  assert.ok(html.includes('swagger-ui'))
})

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

export {fakeVerifyToken, fakeFavoritesRepo, fakeReviewsRepo, createApp, base, getJson}
