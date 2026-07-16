<script setup>
import {useAuthStore} from "@/store/authStore";
const authStore = useAuthStore();
</script>

<template>
  <footer class="bg-[#188E6B]">
    <div class="max-w-[1200px] mx-auto px-6 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      <div class="flex flex-col items-center md:items-start gap-3">
        <img src="../assets/images/footer-logo.svg" alt="島遊" class="h-4" />
        <p class="text-[#DAF9F0] text-[13px] text-center md:text-left">
          島遊台灣，探索屬於你的旅程
        </p>
      </div>

      <ul class="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[#DAF9F0] text-[14px]">
        <li>
          <router-link :to="{name: 'home'}" class="hover:text-white">首頁</router-link>
        </li>
        <li>
          <router-link :to="{name: 'viewList'}" class="hover:text-white">找景點</router-link>
        </li>
        <li>
          <router-link
            :to="authStore.user ? {name: 'myJourney'} : {name: 'login'}"
            class="hover:text-white"
          >
            {{ authStore.user ? "我的旅程" : "登入" }}
          </router-link>
        </li>
      </ul>
    </div>
    <div class="border-t border-solid border-[rgba(40,218,165,0.3)]">
      <p class="text-[rgba(218,249,240,0.7)] text-[12px] text-center py-4">
        © {{ new Date().getFullYear() }} 島遊 TravelTaiwan
      </p>
    </div>
  </footer>
</template>
