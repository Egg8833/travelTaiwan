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
