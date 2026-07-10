import admin from 'firebase-admin'

function initializeIfNeeded() {
  if (admin.apps.length) return
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON env var is required')
  }
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
  })
}

function lazy(getReal) {
  return new Proxy({}, {
    get(_, prop) {
      initializeIfNeeded()
      const real = getReal()
      const value = real[prop]
      return typeof value === 'function' ? value.bind(real) : value
    },
  })
}

export const auth = lazy(() => admin.auth())
export const firestore = lazy(() => admin.firestore())
