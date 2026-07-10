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
