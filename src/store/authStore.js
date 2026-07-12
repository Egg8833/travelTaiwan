import {defineStore} from 'pinia'
import {ref, triggerRef} from 'vue'
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
import {deleteAccountApi} from '@/api/index.js'

const authErrorMessages = {
  'auth/email-already-in-use': '這個 Email 已經被註冊過了',
  'auth/invalid-email': 'Email 格式不正確',
  'auth/weak-password': '密碼強度不足，至少需要 6 個字元',
  'auth/wrong-password': '密碼錯誤',
  'auth/user-not-found': '找不到這個帳號',
  'auth/invalid-credential': '帳號或密碼錯誤',
  'auth/popup-closed-by-user': 'Google 登入視窗已關閉',
  'auth/requires-recent-login': '請重新輸入密碼再試一次',
}

const toMessage = e => authErrorMessages[e.code] || '發生錯誤，請稍後再試'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const isAuthReady = ref(false)

  onAuthStateChanged(firebaseAuth, firebaseUser => {
    user.value = firebaseUser
    isAuthReady.value = true
  })

  const loginWithEmail = async (email, password) => {
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password)
      return true
    } catch (e) {
      console.error(e)
      alert(toMessage(e))
      return false
    }
  }

  const registerWithEmail = async (email, password) => {
    try {
      await createUserWithEmailAndPassword(firebaseAuth, email, password)
      return true
    } catch (e) {
      console.error(e)
      alert(toMessage(e))
      return false
    }
  }

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(firebaseAuth, googleProvider)
      return true
    } catch (e) {
      console.error(e)
      alert(toMessage(e))
      return false
    }
  }

  const logout = async () => {
    await signOut(firebaseAuth)
  }

  const updateDisplayName = async name => {
    try {
      await updateProfile(firebaseAuth.currentUser, {displayName: name})
      triggerRef(user)
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
      triggerRef(user)
      return true
    } catch (e) {
      console.error(e)
      alert('上傳大頭貼失敗，請稍後再試')
      return false
    }
  }

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
})
