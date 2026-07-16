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
  <div class="login-page flex flex-col md:flex-row min-h-[calc(100dvh-144px)] md:min-h-[calc(100dvh-172px)]">
    <div class="login-visual relative hidden md:flex md:w-[45%] lg:w-1/2 items-end p-10 lg:p-14 shrink-0">
      <router-link to="/" class="absolute top-10 left-10 z-10">
        <img src="../assets/images/logo.svg" alt="島遊" class="h-5 brightness-0 invert" />
      </router-link>
      <div class="relative z-10 text-white max-w-[380px]">
        <p class="eyebrow text-[#DAF9F0] text-[12px] font-700 tracking-widest mb-3">
          島遊 · 從這裡開始
        </p>
        <h2 class="text-[28px] lg:text-[34px] font-700 leading-tight mb-3">
          把喜歡的景點<br />都留在你的旅程裡
        </h2>
        <p class="text-[15px] text-[#DAF9F0] leading-relaxed">
          收藏景點、規劃下一趟旅程，登入後就能在任何裝置上同步你的收藏清單。
        </p>
      </div>
    </div>

    <div class="flex-1 flex items-center justify-center px-6 py-14">
      <div class="w-full max-w-[380px]">
        <router-link to="/" class="md:hidden flex justify-center mb-10">
          <img src="../assets/images/logo.svg" alt="島遊" class="h-6" />
        </router-link>

        <div class="mode-switch flex p-1 mb-8 bg-[#F3FBF8] rounded-60px">
          <button
            type="button"
            class="flex-1 py-2.5 rounded-60px font-700 text-[15px] transition-all duration-200"
            :class="mode === 'login' ? 'bg-white text-[#188E6B] shadow024' : 'text-[#808080]'"
            @click="mode = 'login'"
          >
            登入
          </button>
          <button
            type="button"
            class="flex-1 py-2.5 rounded-60px font-700 text-[15px] transition-all duration-200"
            :class="mode === 'register' ? 'bg-white text-[#188E6B] shadow024' : 'text-[#808080]'"
            @click="mode = 'register'"
          >
            註冊
          </button>
        </div>

        <form class="grid gap-4" @submit.prevent="submit">
          <input
            v-model="email"
            type="email"
            required
            placeholder="Email"
            class="rounded-[8px] border-1 border-solid border-[#eee] py-3 px-4 outline-none transition-colors duration-200 focus:border-[#1FB588]"
          />
          <input
            v-model="password"
            type="password"
            required
            minlength="6"
            placeholder="密碼（至少 6 碼）"
            class="rounded-[8px] border-1 border-solid border-[#eee] py-3 px-4 outline-none transition-colors duration-200 focus:border-[#1FB588]"
          />
          <button type="submit" :disabled="submitting" class="btn w-full">
            {{ mode === 'login' ? (submitting ? '登入中…' : '登入') : (submitting ? '註冊中…' : '註冊') }}
          </button>
        </form>

        <div class="flex items-center gap-3 my-6">
          <div class="flex-1 h-px bg-[#eee]"></div>
          <span class="text-[#808080] text-[13px]">或</span>
          <div class="flex-1 h-px bg-[#eee]"></div>
        </div>

        <button
          class="w-full flex items-center justify-center gap-2 py-3 rounded-60px border-1 border-solid border-[#eee] text-[#616161] font-700 transition-all duration-200 hover:border-[#1FB588] hover:bg-[#F3FBF8] disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="submitting"
          @click="submitGoogle"
        >
          <img src="../assets/images/icon/google-login.svg" alt="" class="h-5" />
          使用 Google 繼續
        </button>

        <p class="mt-6 text-center text-[#808080] text-[14px]">
          {{ mode === 'login' ? '還沒有帳號？' : '已經有帳號了？' }}
          <button
            type="button"
            class="text-[#1FB588] font-700 underline"
            @click="mode = mode === 'login' ? 'register' : 'login'"
          >
            {{ mode === 'login' ? '註冊一個' : '直接登入' }}
          </button>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-visual {
  background-image: linear-gradient(180deg, rgba(19, 46, 38, 0.25) 0%, rgba(19, 46, 38, 0.65) 100%),
    url("../assets/images/login-bg.png");
  background-size: cover;
  background-position: center;
}
</style>
