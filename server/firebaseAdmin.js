import {cert, getApps, initializeApp} from 'firebase-admin/app'
import {getAuth} from 'firebase-admin/auth'
import {getFirestore} from 'firebase-admin/firestore'
import {getStorage} from 'firebase-admin/storage'

function initializeIfNeeded() {
  if (getApps().length) return
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON env var is required')
  }
  initializeApp({
    credential: cert(JSON.parse(serviceAccountJson)),
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

export const auth = lazy(() => getAuth())
export const firestore = lazy(() => getFirestore())
export const storage = lazy(() => getStorage())
