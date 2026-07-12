# 帳號設定功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 my-journey 頁面新增帳號設定區塊：改名字、上傳大頭貼、改密碼、改 Email、刪除帳號（含 Firestore 資料的級聯刪除）。

**Architecture:** 前端在 `authStore.js` 新增對應 actions，UI 拆成 `src/components/account/` 下的獨立子元件並組合進 `AccountSettingsPanel.vue`；後端新增 `accountRepo.js` 與 `DELETE /api/account` 路由，用 Firestore `collectionGroup` 查詢級聯刪除評論、整批刪除收藏，最後刪除 Firebase Auth 帳號。

**Tech Stack:** Vue 3 `<script setup>` + Pinia + UnoCSS（既有 `.btn`/`.btn-secondary` class）、Firebase Auth + Storage（前端 SDK v12，已在 `package.json`）、Express + firebase-admin（後端）、Node 內建 `node:test`（後端唯一測試框架；前端無測試框架，用手動瀏覽器驗證）。

## Global Constraints

- 後端所有新路由必須經過 `verifyToken` 中介層驗證。
- 後端測試沿用 `server/app.test.js` 的 fake-repo 風格（in-memory 假物件），不要引入額外的 mock 函式庫。
- 前端所有跟 Firebase Auth 互動的新 action 都放在 `src/store/authStore.js`，元件不得直接 import `firebase/auth`。
- 密碼類 input 一律 `type="password"`；新 Email 修改一律走 `verifyBeforeUpdateEmail`（不得用會立即生效的 `updateEmail`）。
- Google 登入帳號（`providerData[0].providerId === 'google.com'`）不得顯示修改密碼/Email 的表單。
- UnoCSS class 一律沿用專案既有寫法（例如 `rounded-[8px] border-1 border-solid border-[#eee] py-2 px-4` 的輸入框樣式、`.btn`/`.btn-secondary` 按鈕），不要引入新的 CSS 框架或 class 命名慣例。

---

### Task 1: 後端 — `accountRepo.js`（Firestore 級聯刪除邏輯）

**Files:**
- Create: `server/repositories/accountRepo.js`
- Test: `server/repositories/accountRepo.test.js`

**Interfaces:**
- Consumes: 無（本任務是最底層，只依賴傳入的 `firestore`、`auth` 物件，型態比照 `server/firebaseAdmin.js` 匯出的 `firestore`/`auth`）
- Produces: `createAccountRepo(firestore, auth) => { deleteAccount(uid: string): Promise<void> }`，Task 2 會消費這個 `deleteAccount` 方法。

- [ ] **Step 1: 寫失敗測試**

建立 `server/repositories/accountRepo.test.js`：

```js
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

test('deleteAccount 刪除該使用者的收藏、評論，並刪除 Auth 帳號', async () => {
  const firestore = makeFakeFirestore({
    favSpotIds: ['spot-1', 'spot-2'],
    reviewEntries: [{spotId: 'spot-9', reviewId: 'r1'}],
  })
  const deletedUsers = []
  const auth = {deleteUser: async uid => deletedUsers.push(uid)}
  const repo = createAccountRepo(firestore, auth)

  await repo.deleteAccount('user-123')

  assert.ok(firestore.deletedPaths.includes('favorites/user-123/spots/spot-1'))
  assert.ok(firestore.deletedPaths.includes('favorites/user-123/spots/spot-2'))
  assert.ok(firestore.deletedPaths.includes('reviews/spot-9/entries/r1'))
  assert.ok(firestore.deletedPaths.includes('favorites/user-123'))
  assert.deepEqual(deletedUsers, ['user-123'])
})

test('Firestore 刪除失敗時不會呼叫 auth.deleteUser', async () => {
  const firestore = makeFakeFirestore({favSpotIds: [], reviewEntries: [], failCommit: true})
  const deletedUsers = []
  const auth = {deleteUser: async uid => deletedUsers.push(uid)}
  const repo = createAccountRepo(firestore, auth)

  await assert.rejects(() => repo.deleteAccount('user-123'))
  assert.deepEqual(deletedUsers, [])
})
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
cd server && node --test repositories/accountRepo.test.js
```

預期：失敗，錯誤訊息類似 `Cannot find module './accountRepo.js'`。

- [ ] **Step 3: 寫最小實作**

建立 `server/repositories/accountRepo.js`：

```js
export const createAccountRepo = (firestore, auth) => ({
  async deleteAccount(uid) {
    const favSnap = await firestore.collection('favorites').doc(uid).collection('spots').get()
    const reviewSnap = await firestore.collectionGroup('entries').where('uid', '==', uid).get()

    const batch = firestore.batch()
    favSnap.docs.forEach(d => batch.delete(d.ref))
    reviewSnap.docs.forEach(d => batch.delete(d.ref))
    batch.delete(firestore.collection('favorites').doc(uid))
    await batch.commit()

    await auth.deleteUser(uid)
  },
})
```

- [ ] **Step 4: 執行測試確認通過**

```bash
cd server && node --test repositories/accountRepo.test.js
```

預期：兩個測試都 PASS。

- [ ] **Step 5: Commit**

```bash
git add server/repositories/accountRepo.js server/repositories/accountRepo.test.js
git commit -m "feat(server): add accountRepo for cascading account deletion"
```

---

### Task 2: 後端 — `DELETE /api/account` 路由

**Files:**
- Modify: `server/app.js`
- Modify: `server/index.js`
- Modify: `server/openapi.js`
- Modify: `server/app.test.js`

**Interfaces:**
- Consumes: `createAccountRepo` 匯出的 `{deleteAccount(uid)}`（Task 1）
- Produces: `DELETE /api/account`（需帶 `Authorization: Bearer <token>`，成功回 204，未登入回 401），供前端 Task 5 的 `deleteAccountApi` 呼叫。

- [ ] **Step 1: 在 `server/app.test.js` 寫失敗測試**

在檔案頂部 `fakeReviewsRepo` 定義之後、`const app = createApp({...})` 之前，新增：

```js
const deletedAccounts = []
const fakeAccountRepo = {
  async deleteAccount(uid) {
    deletedAccounts.push(uid)
  },
}
```

修改 `createApp` 呼叫，加入 `accountRepo`：

```js
const app = createApp({
  verifyToken: fakeVerifyToken,
  favoritesRepo: fakeFavoritesRepo,
  reviewsRepo: fakeReviewsRepo,
  accountRepo: fakeAccountRepo,
})
```

在檔案最後一個 `test(...)`（`編輯不存在的評論回 404`）之後、`export {...}` 之前，新增：

```js
test('DELETE /api/account 未帶 token 回 401', async () => {
  const res = await fetch(base + '/api/account', {method: 'DELETE'})
  assert.equal(res.status, 401)
})

test('DELETE /api/account 已登入回 204 並呼叫 accountRepo.deleteAccount', async () => {
  const res = await fetch(base + '/api/account', {
    method: 'DELETE',
    headers: {Authorization: 'Bearer valid-token'},
  })
  assert.equal(res.status, 204)
  assert.ok(deletedAccounts.includes('test-uid'))
})
```

同時把既有這個斷言：

```js
  assert.equal(Object.keys(body.paths).length, 11)
```

改成：

```js
  assert.equal(Object.keys(body.paths).length, 12)
```

（因為這個任務會在 `openapi.js` 新增一個 path，見 Step 3。）

- [ ] **Step 2: 執行測試確認失敗**

```bash
cd server && node --test app.test.js
```

預期：新增的兩個 `/api/account` 測試 FAIL（404 Not Found，因為路由還不存在），openapi path 數量測試也 FAIL（目前還是 11）。

- [ ] **Step 3: 實作路由與相關檔案**

修改 `server/app.js`：函式簽名新增 `accountRepo` 參數：

```js
export function createApp({verifyToken, favoritesRepo, reviewsRepo, accountRepo}) {
```

在既有 `app.delete('/api/reviews/:spotId/:reviewId', ...)` 路由之後、`app.get('/api/openapi.json', ...)` 之前，新增：

```js
  app.delete('/api/account', verifyToken, async (req, res) => {
    await accountRepo.deleteAccount(req.uid)
    res.status(204).end()
  })
```

修改 `server/index.js`，加入 import 與注入：

```js
import {createAccountRepo} from './repositories/accountRepo.js'
```

```js
const app = createApp({
  verifyToken: createVerifyFirebaseToken(auth),
  favoritesRepo: createFavoritesRepo(firestore),
  reviewsRepo: createReviewsRepo(firestore),
  accountRepo: createAccountRepo(firestore, auth),
})
```

修改 `server/openapi.js`，在 `paths` 物件裡的 `'/api/reviews/{spotId}/{reviewId}'` 區塊之後（`},` 之後、`paths` 結尾 `},` 之前）新增：

```js
    '/api/account': {
      delete: {
        tags: ['Member'],
        summary: '刪除目前登入帳號（含收藏、評論與 Firebase Auth 帳號，無法復原）',
        security: [{bearerAuth: []}],
        responses: {
          204: {description: '帳號已刪除'},
          401: {description: '未登入或 Token 無效', content: {'application/json': {schema: {$ref: '#/components/schemas/Error'}}}},
        },
      },
    },
```

- [ ] **Step 4: 執行測試確認通過**

```bash
cd server && node --test app.test.js
```

預期：全部測試（含既有的）都 PASS。

- [ ] **Step 5: Commit**

```bash
git add server/app.js server/index.js server/openapi.js server/app.test.js
git commit -m "feat(server): add DELETE /api/account route"
```

---

### Task 3: 前端 — Firebase Storage 初始化 + 改名字/上傳大頭貼 store actions

**Files:**
- Modify: `src/firebase.js`
- Modify: `src/store/authStore.js`

**Interfaces:**
- Consumes: 無新依賴（`firebaseAuth` 已存在）
- Produces: `src/firebase.js` 新增匯出 `firebaseStorage`；`authStore` 新增 `updateDisplayName(name: string): Promise<boolean>` 與 `uploadAvatar(file: File): Promise<boolean>`，供 Task 6 的元件呼叫。

- [ ] **Step 1: 修改 `src/firebase.js`**

```js
import {initializeApp} from 'firebase/app'
import {getAuth, GoogleAuthProvider} from 'firebase/auth'
import {getStorage} from 'firebase/storage'

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
export const firebaseStorage = getStorage(firebaseApp)
```

- [ ] **Step 2: 修改 `src/store/authStore.js` — imports 與新增 actions**

把 import 區塊改成：

```js
import {defineStore} from 'pinia'
import {ref} from 'vue'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  updatePassword,
  verifyBeforeUpdateEmail,
} from 'firebase/auth'
import {ref as storageRef, uploadBytes, getDownloadURL} from 'firebase/storage'
import {firebaseAuth, googleProvider, firebaseStorage} from '@/firebase.js'
```

（`reauthenticateWithPopup`、`EmailAuthProvider` 等本任務的 `updateDisplayName`/`uploadAvatar` 用不到，但因為是同一個 import 區塊、Task 4 會用到，一次寫好避免重複修改同一段 import。`deleteAccountApi` 不在這裡 import —— 它要等 Task 5 建立好 `src/api/index.js` 裡的 `deleteAccountApi` 匯出之後才能 import，否則 ESM 會因為引用不存在的具名匯出而在載入時直接噴錯，把整個 app 弄掛。）

在 `authErrorMessages` 物件裡新增一行：

```js
  'auth/requires-recent-login': '請重新輸入密碼再試一次',
```

在 `logout` action 之後、`return {...}` 之前，新增：

```js
  const updateDisplayName = async name => {
    try {
      await updateProfile(firebaseAuth.currentUser, {displayName: name})
      user.value = {...firebaseAuth.currentUser}
      return true
    } catch (e) {
      console.error(e)
      alert(toMessage(e))
      return false
    }
  }

  const uploadAvatar = async file => {
    try {
      const fileRef = storageRef(firebaseStorage, `avatars/${firebaseAuth.currentUser.uid}`)
      await uploadBytes(fileRef, file, {contentType: file.type})
      const photoURL = await getDownloadURL(fileRef)
      await updateProfile(firebaseAuth.currentUser, {photoURL})
      user.value = {...firebaseAuth.currentUser}
      return true
    } catch (e) {
      console.error(e)
      alert('上傳大頭貼失敗，請稍後再試')
      return false
    }
  }
```

把最後的 `return {...}` 改成（先只加這兩個，Task 4/5 會再擴充）：

```js
  return {
    user,
    isAuthReady,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    logout,
    updateDisplayName,
    uploadAvatar,
  }
```

- [ ] **Step 3: 手動驗證**

```bash
npm run dev
```

登入一個 email/password 測試帳號 → 開瀏覽器 devtools console，貼上：

```js
await (await import('/src/store/authStore.js')).useAuthStore().updateDisplayName('測試名稱')
```

預期：console 沒有噴錯，重新整理頁面後（因為 `MyJourneyView.vue` 目前還是讀 `authStore.user?.displayName`）畫面上的名字變成「測試名稱」。這一步只驗證 store action 本身可用，UI 串接留給 Task 9。

- [ ] **Step 4: Commit**

```bash
git add src/firebase.js src/store/authStore.js
git commit -m "feat(auth): add updateDisplayName and uploadAvatar store actions"
```

---

### Task 4: 前端 — 改密碼/改 Email store actions

**Files:**
- Modify: `src/store/authStore.js`

**Interfaces:**
- Consumes: Task 3 已加好的 imports（`reauthenticateWithCredential`、`reauthenticateWithPopup`、`EmailAuthProvider`、`updatePassword`、`verifyBeforeUpdateEmail`、`googleProvider`）
- Produces: `changePassword(currentPassword: string, newPassword: string): Promise<boolean>`、`changeEmail(currentPassword: string, newEmail: string): Promise<boolean>`、`reauthenticate(password: string): Promise<boolean>`，供 Task 7、Task 8 的元件呼叫。`reauthenticate` 內部依目前登入方式（`providerData[0].providerId`）分流：`password` 用傳入密碼重新驗證，`google.com` 忽略密碼參數改跳 Google 重新登入視窗。

- [ ] **Step 1: 在 `src/store/authStore.js` 新增 actions**

在 Task 3 新增的 `uploadAvatar` 之後、`return {...}` 之前，新增：

```js
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const credential = EmailAuthProvider.credential(firebaseAuth.currentUser.email, currentPassword)
      await reauthenticateWithCredential(firebaseAuth.currentUser, credential)
      await updatePassword(firebaseAuth.currentUser, newPassword)
      return true
    } catch (e) {
      console.error(e)
      alert(toMessage(e))
      return false
    }
  }

  const changeEmail = async (currentPassword, newEmail) => {
    try {
      const credential = EmailAuthProvider.credential(firebaseAuth.currentUser.email, currentPassword)
      await reauthenticateWithCredential(firebaseAuth.currentUser, credential)
      await verifyBeforeUpdateEmail(firebaseAuth.currentUser, newEmail)
      return true
    } catch (e) {
      console.error(e)
      alert(toMessage(e))
      return false
    }
  }

  const reauthenticate = async password => {
    try {
      const providerId = firebaseAuth.currentUser.providerData[0]?.providerId
      if (providerId === 'google.com') {
        await reauthenticateWithPopup(firebaseAuth.currentUser, googleProvider)
      } else {
        const credential = EmailAuthProvider.credential(firebaseAuth.currentUser.email, password)
        await reauthenticateWithCredential(firebaseAuth.currentUser, credential)
      }
      return true
    } catch (e) {
      console.error(e)
      alert(toMessage(e))
      return false
    }
  }
```

更新 `return {...}`：

```js
  return {
    user,
    isAuthReady,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    logout,
    updateDisplayName,
    uploadAvatar,
    changePassword,
    changeEmail,
    reauthenticate,
  }
```

- [ ] **Step 2: 手動驗證**

```bash
npm run dev
```

用測試帳號登入，瀏覽器 console：

```js
const store = (await import('/src/store/authStore.js')).useAuthStore()
await store.changePassword('目前密碼', '新密碼123')
```

預期：無錯誤。接著登出、用新密碼重新登入，確認可以登入成功。

- [ ] **Step 3: Commit**

```bash
git add src/store/authStore.js
git commit -m "feat(auth): add changePassword, changeEmail, reauthenticate store actions"
```

---

### Task 5: 前端 — 刪除帳號 API + store action

**Files:**
- Modify: `src/api/index.js`
- Modify: `src/store/authStore.js`

**Interfaces:**
- Consumes: 後端 `DELETE /api/account`（Task 2）
- Produces: `deleteAccountApi(): Promise<void>`（`src/api/index.js`）；`authStore.deleteAccount(): Promise<boolean>`，供 Task 8 的 `DeleteAccountForm.vue` 呼叫。

- [ ] **Step 1: 修改 `src/api/index.js`**

在檔案最後新增：

```js
export const deleteAccountApi = () => api.delete('/account').then(res => res.data)
```

- [ ] **Step 2: 修改 `src/store/authStore.js` 新增 `deleteAccount`**

把 import 區塊裡的 `import {firebaseAuth, googleProvider, firebaseStorage} from '@/firebase.js'` 這一行之後新增一行：

```js
import {deleteAccountApi} from '@/api/index.js'
```

在 Task 4 新增的 `reauthenticate` 之後、`return {...}` 之前，新增：

```js
  const deleteAccount = async () => {
    try {
      await deleteAccountApi()
      await signOut(firebaseAuth)
      return true
    } catch (e) {
      console.error(e)
      alert('刪除帳號失敗，請稍後再試')
      return false
    }
  }
```

更新 `return {...}`，加入 `deleteAccount`：

```js
  return {
    user,
    isAuthReady,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    logout,
    updateDisplayName,
    uploadAvatar,
    changePassword,
    changeEmail,
    reauthenticate,
    deleteAccount,
  }
```

- [ ] **Step 3: 手動驗證**

用一個**可以捨棄的測試帳號**（不要用真實帳號測試！）登入，瀏覽器 console：

```js
const store = (await import('/src/store/authStore.js')).useAuthStore()
await store.deleteAccount()
```

預期：呼叫成功後自動登出；到 Firebase Console 確認該 uid 在 Authentication 使用者清單裡消失，Firestore 的 `favorites/{uid}` 與該使用者發過的 `reviews/*/entries/*` 文件也都不見了。

- [ ] **Step 4: Commit**

```bash
git add src/api/index.js src/store/authStore.js
git commit -m "feat(auth): add deleteAccount store action"
```

---

### Task 6: 前端 — `EditNameForm.vue` + `AvatarUploader.vue`

**Files:**
- Create: `src/components/account/EditNameForm.vue`
- Create: `src/components/account/AvatarUploader.vue`

**Interfaces:**
- Consumes: `authStore.updateDisplayName(name)`、`authStore.uploadAvatar(file)`（Task 3）
- Produces: 兩個獨立元件，Task 9 會把它們組合進 `AccountSettingsPanel.vue`。

- [ ] **Step 1: 建立 `src/components/account/EditNameForm.vue`**

```vue
<script setup>
import {ref} from "vue";
import {useAuthStore} from "@/store/authStore.js";

const authStore = useAuthStore();
const name = ref(authStore.user?.displayName || "");
const saving = ref(false);

const save = async () => {
  if (!name.value.trim()) {
    alert("請輸入名稱");
    return;
  }
  saving.value = true;
  await authStore.updateDisplayName(name.value.trim());
  saving.value = false;
};
</script>

<template>
  <div class="pb-6 border-b border-b-solid border-[#eee]">
    <p class="font-700 text-[#434343] mb-2">顯示名稱</p>
    <div class="flex gap-2">
      <input
        v-model="name"
        type="text"
        class="flex-1 rounded-[8px] border-1 border-solid border-[#eee] py-2 px-4"
      />
      <button class="btn" :disabled="saving" @click="save">
        {{ saving ? "儲存中…" : "儲存" }}
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 2: 建立 `src/components/account/AvatarUploader.vue`**

```vue
<script setup>
import {ref} from "vue";
import {useAuthStore} from "@/store/authStore.js";

const authStore = useAuthStore();
const uploading = ref(false);
const fileInput = ref(null);

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024;

const pickFile = () => fileInput.value?.click();

const onFileChange = async e => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  if (!ALLOWED_TYPES.includes(file.type)) {
    alert("請上傳 jpg、png 或 webp 格式的圖片");
    return;
  }
  if (file.size > MAX_SIZE) {
    alert("圖片大小請勿超過 2MB");
    return;
  }
  uploading.value = true;
  await authStore.uploadAvatar(file);
  uploading.value = false;
};
</script>

<template>
  <div class="pt-6 pb-6 border-b border-b-solid border-[#eee]">
    <p class="font-700 text-[#434343] mb-2">大頭貼</p>
    <div class="flex items-center gap-4">
      <img
        v-if="authStore.user?.photoURL"
        :src="authStore.user.photoURL"
        class="w-14 h-14 rounded-full object-cover"
        alt="avatar"
      />
      <div v-else class="w-14 h-14 rounded-full bg-[#1FB588]"></div>
      <button class="btn-secondary" :disabled="uploading" @click="pickFile">
        {{ uploading ? "上傳中…" : "更換大頭貼" }}
      </button>
      <input
        ref="fileInput"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        class="hidden"
        @change="onFileChange"
      />
    </div>
  </div>
</template>
```

- [ ] **Step 3: 手動驗證**

這兩個元件還沒被任何頁面引用，先用 Vite 的建置檢查有沒有語法錯誤：

```bash
npx vite build
```

預期：build 成功（0 error）。實際互動驗證留到 Task 9 串進頁面後一起做。

- [ ] **Step 4: Commit**

```bash
git add src/components/account/EditNameForm.vue src/components/account/AvatarUploader.vue
git commit -m "feat(account): add EditNameForm and AvatarUploader components"
```

---

### Task 7: 前端 — `ChangePasswordForm.vue` + `ChangeEmailForm.vue`

**Files:**
- Create: `src/components/account/ChangePasswordForm.vue`
- Create: `src/components/account/ChangeEmailForm.vue`

**Interfaces:**
- Consumes: `authStore.changePassword(current, next)`、`authStore.changeEmail(current, newEmail)`（Task 4）
- Produces: 兩個獨立元件，Task 9 會在 `AccountSettingsPanel.vue` 裡只對 `password` provider 使用者渲染。

- [ ] **Step 1: 建立 `src/components/account/ChangePasswordForm.vue`**

```vue
<script setup>
import {ref} from "vue";
import {useAuthStore} from "@/store/authStore.js";

const authStore = useAuthStore();
const currentPassword = ref("");
const newPassword = ref("");
const saving = ref(false);

const save = async () => {
  if (newPassword.value.length < 6) {
    alert("新密碼至少需要 6 個字元");
    return;
  }
  saving.value = true;
  const ok = await authStore.changePassword(currentPassword.value, newPassword.value);
  saving.value = false;
  if (ok) {
    currentPassword.value = "";
    newPassword.value = "";
    alert("密碼已更新");
  }
};
</script>

<template>
  <div class="pt-6 pb-6 border-b border-b-solid border-[#eee]">
    <p class="font-700 text-[#434343] mb-2">修改密碼</p>
    <input
      v-model="currentPassword"
      type="password"
      placeholder="目前密碼"
      class="w-full mb-2 rounded-[8px] border-1 border-solid border-[#eee] py-2 px-4"
    />
    <input
      v-model="newPassword"
      type="password"
      placeholder="新密碼（至少 6 個字元）"
      class="w-full mb-2 rounded-[8px] border-1 border-solid border-[#eee] py-2 px-4"
    />
    <button class="btn" :disabled="saving" @click="save">
      {{ saving ? "更新中…" : "更新密碼" }}
    </button>
  </div>
</template>
```

- [ ] **Step 2: 建立 `src/components/account/ChangeEmailForm.vue`**

```vue
<script setup>
import {ref} from "vue";
import {useAuthStore} from "@/store/authStore.js";

const authStore = useAuthStore();
const currentPassword = ref("");
const newEmail = ref("");
const saving = ref(false);
const sent = ref(false);

const save = async () => {
  if (!newEmail.value.includes("@")) {
    alert("請輸入正確的 Email 格式");
    return;
  }
  saving.value = true;
  const ok = await authStore.changeEmail(currentPassword.value, newEmail.value);
  saving.value = false;
  if (ok) {
    currentPassword.value = "";
    sent.value = true;
  }
};
</script>

<template>
  <div class="pt-6 pb-6 border-b border-b-solid border-[#eee]">
    <p class="font-700 text-[#434343] mb-2">修改 Email</p>
    <p v-if="sent" class="text-[#1FB588] mb-2">
      驗證信已寄到新信箱，請點擊信中連結完成變更（完成前畫面上仍會顯示舊 Email）。
    </p>
    <input
      v-model="currentPassword"
      type="password"
      placeholder="目前密碼"
      class="w-full mb-2 rounded-[8px] border-1 border-solid border-[#eee] py-2 px-4"
    />
    <input
      v-model="newEmail"
      type="email"
      placeholder="新 Email"
      class="w-full mb-2 rounded-[8px] border-1 border-solid border-[#eee] py-2 px-4"
    />
    <button class="btn" :disabled="saving" @click="save">
      {{ saving ? "送出中…" : "送出驗證信" }}
    </button>
  </div>
</template>
```

- [ ] **Step 3: 手動驗證**

```bash
npx vite build
```

預期：build 成功。

- [ ] **Step 4: Commit**

```bash
git add src/components/account/ChangePasswordForm.vue src/components/account/ChangeEmailForm.vue
git commit -m "feat(account): add ChangePasswordForm and ChangeEmailForm components"
```

---

### Task 8: 前端 — `DeleteAccountForm.vue`

**Files:**
- Create: `src/components/account/DeleteAccountForm.vue`

**Interfaces:**
- Consumes: `authStore.reauthenticate(password)`（Task 4）、`authStore.deleteAccount()`（Task 5）、`authStore.user.providerData`
- Produces: 獨立元件，Task 9 會組合進 `AccountSettingsPanel.vue`。刪除成功後自行 `router.push({name: 'home'})`。

- [ ] **Step 1: 建立 `src/components/account/DeleteAccountForm.vue`**

```vue
<script setup>
import {computed, ref} from "vue";
import {useRouter} from "vue-router";
import {useAuthStore} from "@/store/authStore.js";

const authStore = useAuthStore();
const router = useRouter();

const isGoogleUser = computed(
  () => authStore.user?.providerData?.[0]?.providerId === "google.com"
);
const password = ref("");
const confirmText = ref("");
const reauthenticated = ref(false);
const working = ref(false);

const reauth = async () => {
  working.value = true;
  reauthenticated.value = await authStore.reauthenticate(password.value);
  working.value = false;
};

const confirmDelete = async () => {
  if (confirmText.value !== "刪除") {
    alert('請輸入「刪除」以確認');
    return;
  }
  if (!confirm("確定要永久刪除帳號嗎？此操作無法復原。")) return;
  working.value = true;
  const ok = await authStore.deleteAccount();
  working.value = false;
  if (ok) router.push({name: "home"});
};
</script>

<template>
  <div class="pt-6">
    <p class="font-700 text-[#EB5757] mb-2">刪除帳號</p>
    <p class="text-[#808080] mb-3">
      刪除後，你的收藏與評論都會一併永久刪除，且無法復原。
    </p>

    <div v-if="!reauthenticated">
      <input
        v-if="!isGoogleUser"
        v-model="password"
        type="password"
        placeholder="請輸入目前密碼以繼續"
        class="w-full mb-2 rounded-[8px] border-1 border-solid border-[#eee] py-2 px-4"
      />
      <button class="btn-secondary" :disabled="working" @click="reauth">
        {{ isGoogleUser ? "重新以 Google 登入驗證" : "驗證身份" }}
      </button>
    </div>

    <div v-else>
      <input
        v-model="confirmText"
        type="text"
        placeholder='請輸入「刪除」以確認'
        class="w-full mb-2 rounded-[8px] border-1 border-solid border-[#eee] py-2 px-4"
      />
      <button
        class="py-2 px-5 rounded-[62px] border-1 border-solid border-[#EB5757] text-[#EB5757] font-700"
        :disabled="working"
        @click="confirmDelete"
      >
        {{ working ? "刪除中…" : "永久刪除帳號" }}
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 2: 手動驗證**

```bash
npx vite build
```

預期：build 成功。

- [ ] **Step 3: Commit**

```bash
git add src/components/account/DeleteAccountForm.vue
git commit -m "feat(account): add DeleteAccountForm component"
```

---

### Task 9: 前端 — `AccountSettingsPanel.vue` 組合 + 串進 `MyJourneyView.vue`

**Files:**
- Create: `src/components/account/AccountSettingsPanel.vue`
- Modify: `src/views/MyJourneyView.vue`

**Interfaces:**
- Consumes: Task 6/7/8 的五個子元件、`authStore.user.providerData`
- Produces: 完整可用的「帳號設定」UI 區塊，插入 `MyJourneyView.vue` 現有的頭像/名字列與「我的收藏」標題之間。

- [ ] **Step 1: 建立 `src/components/account/AccountSettingsPanel.vue`**

```vue
<script setup>
import {computed} from "vue";
import {useAuthStore} from "@/store/authStore.js";
import EditNameForm from "./EditNameForm.vue";
import AvatarUploader from "./AvatarUploader.vue";
import ChangePasswordForm from "./ChangePasswordForm.vue";
import ChangeEmailForm from "./ChangeEmailForm.vue";
import DeleteAccountForm from "./DeleteAccountForm.vue";

const authStore = useAuthStore();
const isPasswordUser = computed(
  () => authStore.user?.providerData?.[0]?.providerId === "password"
);
</script>

<template>
  <div class="mb-8">
    <h2 class="text-[20px] font-700 text-[#434343] mb-4">帳號設定</h2>
    <EditNameForm />
    <AvatarUploader />
    <template v-if="isPasswordUser">
      <ChangePasswordForm />
      <ChangeEmailForm />
    </template>
    <DeleteAccountForm />
  </div>
</template>
```

- [ ] **Step 2: 修改 `src/views/MyJourneyView.vue`**

在 import 區塊新增：

```js
import AccountSettingsPanel from "@/components/account/AccountSettingsPanel.vue";
```

在 `</div>`（頭像/名字/登出那個 `flex items-center justify-between mb-8` 區塊結尾）之後、`<h2 class="text-[20px] font-700 text-[#434343] mb-4">我的收藏</h2>` 之前，插入：

```vue
    <AccountSettingsPanel />
```

- [ ] **Step 3: 手動端對端驗證**

```bash
npm run dev
```

用一個**測試帳號**（email/password 建立的）登入，走過完整流程：

1. 進入 my-journey 頁 → 確認「帳號設定」區塊顯示，包含改名字、換大頭貼、改密碼、改 Email、刪除帳號五個區塊。
2. 改名字 → 輸入新名字按儲存 → 重新整理頁面 → 確認上方名字與帳號設定裡的名字都變成新名字。
3. 換大頭貼 → 上傳一張圖片 → 確認上傳中有 loading 文字、完成後大頭貼變成新圖片。
4. 上傳超過 2MB 或非圖片格式的檔案 → 確認出現對應錯誤訊息，且不會呼叫上傳。
5. 改密碼 → 輸入錯誤的目前密碼 → 確認出現「密碼錯誤」訊息；輸入正確密碼 + 新密碼 → 確認成功；登出後用新密碼登入成功。
6. 改 Email → 輸入新 Email → 確認出現「驗證信已寄到新信箱」訊息；檢查該信箱有沒有收到 Firebase 驗證信。
7. 刪除帳號 → 輸入錯誤密碼驗證身份 → 確認失敗；輸入正確密碼 → 出現確認刪除輸入框 → 輸入「刪除」二字送出 → 確認跳出瀏覽器 `confirm()` 對話框 → 確認 → 確認導回首頁且已登出；到 Firebase Console 確認該帳號、其收藏、評論都已從 Firestore/Auth 消失。
8. 額外用一個 Google 登入的測試帳號進入 my-journey 頁 → 確認畫面上**沒有**修改密碼/Email 的表單，只有改名字、換頭貼、刪除帳號（刪除帳號按鈕文字應為「重新以 Google 登入驗證」）。

- [ ] **Step 4: Commit**

```bash
git add src/components/account/AccountSettingsPanel.vue src/views/MyJourneyView.vue
git commit -m "feat(account): wire account settings panel into MyJourneyView"
```
