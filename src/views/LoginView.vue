<script setup>
import {ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {useAuthStore} from '@/store/authStore.js'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const mode = ref('login') // 'login' | 'register'
const email = ref('')
const password = ref('')
const submitting = ref(false)

const redirectAfterLogin = () => {
  const target = typeof route.query.redirect === 'string' ? route.query.redirect : '/my-journey'
  router.push(target)
}

const submit = async () => {
  submitting.value = true
  const ok = mode.value === 'login'
    ? await authStore.loginWithEmail(email.value, password.value)
    : await authStore.registerWithEmail(email.value, password.value)
  submitting.value = false
  if (ok) redirectAfterLogin()
}

const submitGoogle = async () => {
  submitting.value = true
  const ok = await authStore.loginWithGoogle()
  submitting.value = false
  if (ok) redirectAfterLogin()
}
</script>

<template>
  <div class="max-w-[400px] mx-auto py-10 px-6">
    <h1 class="text-[24px] font-700 text-[#434343] mb-6">
      {{ mode === 'login' ? '登入' : '註冊' }}
    </h1>

    <form class="grid gap-4" @submit.prevent="submit">
      <input
        v-model="email"
        type="email"
        required
        placeholder="Email"
        class="rounded-[8px] border-1 border-solid border-[#eee] py-2 px-4"
      />
      <input
        v-model="password"
        type="password"
        required
        minlength="6"
        placeholder="密碼（至少 6 碼）"
        class="rounded-[8px] border-1 border-solid border-[#eee] py-2 px-4"
      />
      <button
        type="submit"
        :disabled="submitting"
        class="btn-secondary py-3 rounded-[62px] bg-[#1FB588] text-white font-700"
      >
        {{ mode === 'login' ? '登入' : '註冊' }}
      </button>
    </form>

    <button
      class="mt-3 w-full py-3 rounded-[62px] border-1 border-solid border-[#1Fb588] text-[#616161] font-700"
      :disabled="submitting"
      @click="submitGoogle"
    >
      使用 Google 登入
    </button>

    <p class="mt-4 text-center text-[#808080]">
      <button
        type="button"
        class="underline"
        @click="mode = mode === 'login' ? 'register' : 'login'"
      >
        {{ mode === 'login' ? '還沒有帳號？註冊' : '已經有帳號？登入' }}
      </button>
    </p>
  </div>
</template>
