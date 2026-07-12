# 帳號設定功能設計

日期：2026-07-12

## 背景與範圍

目前 `MyJourneyView.vue`（我的旅程頁）只顯示唯讀的頭像、名字、Email，加上登出按鈕與收藏列表。沒有任何編輯個人資料的功能。

本次要在同一頁面新增一個「帳號設定」區塊，涵蓋：

1. 修改顯示名稱
2. 上傳大頭貼
3. 修改密碼（僅 email/password 帳號）
4. 修改 Email（僅 email/password 帳號，經驗證信確認）
5. 刪除帳號（含 Firestore 資料與 Firebase Auth 帳號的清除）

不包含：頭貼裁切/縮圖 UI、多因素驗證、帳號合併（Google + email 綁定同一帳號）。

## 現況（已確認的技術事實）

- 前端登入機制：純用戶端 Firebase Auth（`src/store/authStore.js`），支援 email/password 與 Google 登入，`onAuthStateChanged` 同步 `user` 狀態。
- `src/firebase.js` 目前只初始化了 `firebaseAuth`，尚未初始化 Firebase Storage（雖然 `VITE_FIREBASE_STORAGE_BUCKET` 環境變數已存在）。
- 後端（`server/app.js`）採 dependency-injection 模式建立 app（`createApp({verifyToken, favoritesRepo, reviewsRepo})`），已有 `firebase-admin`（`server/firebaseAdmin.js`）可用的 `auth`、`firestore`。
- 收藏資料：`favorites/{uid}/spots/{spotId}`（`server/repositories/favoritesRepo.js`）——已經以 uid 分層，整批刪除很直接。
- 評論資料：`reviews/{spotId}/entries/{reviewId}`（`server/repositories/reviewsRepo.js`），以 spotId 分層、entries 內有 `uid` 欄位——要刪除某使用者全部評論，需要 `firestore.collectionGroup('entries').where('uid', '==', uid)` 查詢後批次刪除。
- 目前沒有版控中的 Firestore/Storage security rules 檔案，代表這類規則是直接在 Firebase Console 設定的。

## 架構

在 `MyJourneyView.vue` 內新增 `AccountSettingsPanel.vue`，放在現有頭像/名字列下方、收藏列表上方。內部拆成四個獨立子元件，各自維護自己的 loading/error 狀態：

- `EditNameForm.vue` — 改顯示名稱
- `AvatarUploader.vue` — 上傳大頭貼
- `ChangePasswordForm.vue` / `ChangeEmailForm.vue` — 只在使用者的 `providerData[0].providerId === 'password'` 時渲染
- `DeleteAccountForm.vue` — 帳號刪除（含重新驗證 + 二次確認）

`authStore.js` 新增對應的 actions：`updateDisplayName`、`uploadAvatar`、`changePassword`、`changeEmail`、`deleteAccount`。UI 元件只處理表單狀態並呼叫 store，不直接操作 Firebase SDK，維持現有 store 架構的一致性（現有 `loginWithEmail` 等 action 都是這種包法）。

## 各功能資料流

### 修改顯示名稱（純前端）

`EditNameForm` → `authStore.updateDisplayName(name)`：

```js
await updateProfile(firebaseAuth.currentUser, { displayName: name })
user.value = { ...firebaseAuth.currentUser } // onAuthStateChanged 不會因 updateProfile 觸發，需手動同步
```

### 大頭貼上傳

1. `firebase.js` 新增 `export const firebaseStorage = getStorage(firebaseApp)`。
2. `AvatarUploader` 選檔後，前端先檢查型別（`image/jpeg`、`image/png`、`image/webp`）與大小（≤ 2MB），不符合直接擋下並顯示錯誤，不呼叫 store。
3. `authStore.uploadAvatar(file)`：

```js
const fileRef = storageRef(firebaseStorage, `avatars/${user.value.uid}`)
await uploadBytes(fileRef, file, { contentType: file.type })
const photoURL = await getDownloadURL(fileRef)
await updateProfile(firebaseAuth.currentUser, { photoURL })
user.value = { ...firebaseAuth.currentUser }
```

固定路徑 `avatars/{uid}`（無副檔名，型別存在 metadata），新檔會覆蓋舊檔，不會累積孤兒檔案。

### 修改密碼（僅 `password` provider）

`ChangePasswordForm` 收「目前密碼」「新密碼」→ `authStore.changePassword(currentPassword, newPassword)`：

```js
const credential = EmailAuthProvider.credential(user.value.email, currentPassword)
await reauthenticateWithCredential(firebaseAuth.currentUser, credential)
await updatePassword(firebaseAuth.currentUser, newPassword)
```

### 修改 Email（僅 `password` provider）

`ChangeEmailForm` 收「目前密碼」「新 Email」→ `authStore.changeEmail(currentPassword, newEmail)`：

```js
const credential = EmailAuthProvider.credential(user.value.email, currentPassword)
await reauthenticateWithCredential(firebaseAuth.currentUser, credential)
await verifyBeforeUpdateEmail(firebaseAuth.currentUser, newEmail)
```

UI 顯示「驗證信已寄到新信箱，請點擊信中連結完成變更」。畫面上顯示的 email 在使用者實際點擊驗證連結、下次登入狀態更新前仍是舊的 —— 這點要在提示文字裡寫清楚，避免使用者誤以為沒生效。

### 刪除帳號

前端：

1. `DeleteAccountForm` 要求重新驗證：`password` provider 輸入密碼並 `reauthenticateWithCredential`；Google provider 重新跳出 `signInWithPopup(firebaseAuth, googleProvider)`。
2. 驗證成功才 enable「確認刪除」按鈕，按鈕文字需二次確認（例如彈窗要求輸入「刪除」二字或按鈕本身即最後確認）。
3. 呼叫新後端端點 `DELETE /api/account`（帶目前的 Firebase ID token）。
4. 後端回應成功後，前端呼叫 `authStore.logout()` 並導回首頁，顯示「帳號已刪除」提示。

後端（新增 `accountRepo`，複用 `firebaseAdmin.js` 的 `auth`/`firestore`）：

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

路由：

```js
app.delete('/api/account', verifyToken, async (req, res) => {
  await accountRepo.deleteAccount(req.uid)
  res.status(204).end()
})
```

刪除順序固定為「先刪 Firestore 資料，成功後才刪 Auth 帳號」：就算刪 Auth 那步失敗，殘留狀態是「資料已清空但帳號還能登入、可以重試」，比反過來（Auth 帳號沒了但資料庫孤兒資料還在、沒有 uid 可以再次觸發清除）更安全。

> 注意：單一 Firestore batch 上限為 500 筆寫入。目前每個景點的評論數是小規模（seed 腳本每筆景點個位數筆），單一使用者的評論總數不會接近上限，但如果實作時要防禦超過 500 筆的極端情況，可以把 `favSnap.docs` 與 `reviewSnap.docs` 合併後依 500 筆切 chunk 依序 `commit()`。

## 錯誤處理

- 擴充 `authStore.js` 現有的 `authErrorMessages` 對照表，新增：
  - `auth/requires-recent-login` → 「請重新輸入密碼再試一次」
  - （`auth/wrong-password`、`auth/email-already-in-use`、`auth/invalid-email` 已存在，沿用）
- `AvatarUploader` 的上傳錯誤（網路中斷、超過大小、Storage 規則拒絕）顯示在該元件自己的錯誤區，不影響其他表單。
- `DELETE /api/account` 任一步（Firestore 刪除或 `deleteUser`）拋錯都回 500 並記錄 log；因為採「先刪資料再刪帳號」順序，失敗時不會有無主資料留在資料庫裡查不到擁有者。
- 所有表單 submit 期間 disable 按鈕並顯示 loading，避免重複送出（例如快速連點刪除帳號按鈕造成重複請求）。

## 需要人工設定的部分（不在程式碼裡）

- Firebase Storage 安全規則：專案目前沒有版控的 `storage.rules`。需要手動到 Firebase Console（或用 Firebase CLI，需要你提供部署權限）設定，只允許 `avatars/{uid}` 路徑的擁有者本人讀寫，並限制檔案大小/類型。實作 PR 會附上建議規則內容，但套用需要人工操作。

## 測試計畫

- 後端：比照現有 `server/app.test.js` 風格，為 `DELETE /api/account` 寫整合測試（mock `favoritesRepo`/`reviewsRepo`/admin auth）：
  - 成功刪除（回 204，且各 repo 的刪除方法被呼叫）
  - 未帶 token → 401
  - Firestore 刪除拋錯時，不應呼叫 `auth.deleteUser`
- `accountRepo.deleteAccount` 補單元測試，確認 collectionGroup 查詢條件與 batch 刪除邏輯（用假的 firestore mock）。
- 前端：手動在瀏覽器裡走過五個流程的 golden path + 至少一個錯誤情境（密碼打錯、上傳檔案過大），需要真實 Firebase 測試帳號協助驗證，無法在沒有真實 Firebase 專案的情況下完整自動化測試。

## 待確認事項（已在對話中拍板，此處僅記錄）

- UI 位置：my-journey 頁面內的新區塊（非獨立頁面）。
- Email 修改流程：寄驗證信到新 Email（`verifyBeforeUpdateEmail`）。
- 刪除帳號時評論處理：連同評論一起刪除。
- 刪除帳號前置驗證：需要重新輸入密碼（或 Google 重新登入）。
- 大頭貼上傳：不做裁切 UI，直接上傳原圖（僅前端做型別/大小檢查）。
- Google 帳號：直接隱藏修改密碼/Email 選項。
