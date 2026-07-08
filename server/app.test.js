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
