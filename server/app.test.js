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

export {fakeVerifyToken, fakeFavoritesRepo, fakeReviewsRepo, createApp, base, getJson}
