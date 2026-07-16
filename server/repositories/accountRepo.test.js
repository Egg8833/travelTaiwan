import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createAccountRepo} from './accountRepo.js'

const makeFakeFirestore = ({favSpotIds, reviewEntries, failCommit = false}) => {
  const deletedPaths = []
  return {
    deletedPaths,
    collection(name) {
      if (name !== 'favorites') throw new Error(`unexpected collection: ${name}`)
      return {
        doc(uid) {
          return {
            path: `favorites/${uid}`,
            collection(sub) {
              if (sub !== 'spots') throw new Error(`unexpected subcollection: ${sub}`)
              return {
                async get() {
                  return {
                    docs: favSpotIds.map(spotId => ({
                      ref: {path: `favorites/${uid}/spots/${spotId}`},
                    })),
                  }
                },
              }
            },
          }
        },
      }
    },
    collectionGroup(name) {
      if (name !== 'entries') throw new Error(`unexpected collectionGroup: ${name}`)
      return {
        where() {
          return {
            async get() {
              return {
                docs: reviewEntries.map(({spotId, reviewId}) => ({
                  ref: {path: `reviews/${spotId}/entries/${reviewId}`},
                })),
              }
            },
          }
        },
      }
    },
    batch() {
      return {
        delete(ref) {
          deletedPaths.push(ref.path)
        },
        async commit() {
          if (failCommit) throw new Error('commit failed')
        },
      }
    },
  }
}

const makeFakeStorage = () => {
  const deletedFiles = []
  return {
    deletedFiles,
    bucket() {
      return {
        file(path) {
          return {
            async delete() {
              deletedFiles.push(path)
            },
          }
        },
      }
    },
  }
}

test('deleteAccount 刪除該使用者的收藏、評論、頭像，並刪除 Auth 帳號', async () => {
  const firestore = makeFakeFirestore({
    favSpotIds: ['spot-1', 'spot-2'],
    reviewEntries: [{spotId: 'spot-9', reviewId: 'r1'}],
  })
  const deletedUsers = []
  const auth = {deleteUser: async uid => deletedUsers.push(uid)}
  const storage = makeFakeStorage()
  const repo = createAccountRepo(firestore, auth, storage)

  await repo.deleteAccount('user-123')

  assert.ok(firestore.deletedPaths.includes('favorites/user-123/spots/spot-1'))
  assert.ok(firestore.deletedPaths.includes('favorites/user-123/spots/spot-2'))
  assert.ok(firestore.deletedPaths.includes('reviews/spot-9/entries/r1'))
  assert.ok(firestore.deletedPaths.includes('favorites/user-123'))
  assert.ok(storage.deletedFiles.includes('avatars/user-123'))
  assert.deepEqual(deletedUsers, ['user-123'])
})

test('Firestore 刪除失敗時不會呼叫 storage 刪除或 auth.deleteUser', async () => {
  const firestore = makeFakeFirestore({favSpotIds: [], reviewEntries: [], failCommit: true})
  const deletedUsers = []
  const auth = {deleteUser: async uid => deletedUsers.push(uid)}
  const storage = makeFakeStorage()
  const repo = createAccountRepo(firestore, auth, storage)

  await assert.rejects(() => repo.deleteAccount('user-123'))
  assert.deepEqual(deletedUsers, [])
  assert.deepEqual(storage.deletedFiles, [])
})
