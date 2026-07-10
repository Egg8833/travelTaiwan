import {defineStore} from 'pinia'
import {ref} from 'vue'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import {firebaseAuth, googleProvider} from '@/firebase.js'

const authErrorMessages = {
  'auth/email-already-in-use': '這個 Email 已經被註冊過了',
  'auth/invalid-email': 'Email 格式不正確',
  'auth/weak-password': '密碼強度不足，至少需要 6 個字元',
  'auth/wrong-password': '密碼錯誤',
  'auth/user-not-found': '找不到這個帳號',
  'auth/invalid-credential': '帳號或密碼錯誤',
  'auth/popup-closed-by-user': 'Google 登入視窗已關閉',
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

  return {user, isAuthReady, loginWithEmail, registerWithEmail, loginWithGoogle, logout}
})
