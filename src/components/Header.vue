<script setup>
import { computed, ref, watch } from "vue";
import { useWindowSize } from "@vueuse/core";
const { width: windowWidth } = useWindowSize();

import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useHomeViewStore } from "@/store/homeViewStore";
const homeViewStore = useHomeViewStore();
const { travelName } = storeToRefs(homeViewStore);
const { searchTravel } = homeViewStore;

import { useAuthStore } from "@/store/authStore";
const authStore = useAuthStore();

const menuListShow = ref(false);
const is960Width = computed(() => {
  windowWidth.value >= 960
    ? (menuListShow.value = true)
    : (menuListShow.value = false);
});

const inputText = ref(null);
const clickSearch = () => {
  inputText.value.focus();
  menuListShow.value = !menuListShow.value;
};

const route = useRoute();
watch(route, (newRoute) => {
  if (newRoute.path) {
    // 切換頁面後自動關閉選單
    menuListShow.value = false;
  }
});
</script>

<template>
  <div class="sticky top-0 w-full bg-white z-10">
    <div
      class="relative w-full bg-[#f0f0f0] md:flex md:items-center md:py-5 md:px-3 md:max-w-[1200px] md:bg-white md:mx-auto top-0 z-10"
    >
      <div class="flex justify-between items-center px-6 py-3 md:px-0 md:py-0">
        <button>
          <img
            src="../assets/images/icon/menu.svg"
            alt="menu"
            class="md:hidden"
            @click="menuListShow = !menuListShow"
          />
        </button>
        <router-link to="/">
          <img src="../assets/images/logo.svg" alt="logo" class="h-[21px]" />
        </router-link>
        <button @click="clickSearch">
          <img
            src="../assets/images/icon/search-m.svg"
            alt="search"
            class="md:hidden"
          />
        </button>
      </div>
      <div
        class="absolute top-[54px] left-0 right-0 px-4 py-6 bg-[#f0f0f0] md:static md:flex md:bg-white md:py-0 md:items-center md:w-full md:justify-between md:px-0 md:pl-6"
        :class="{ hidden: !menuListShow, 'md:block': is960Width }"
      >
        <div class="relative pb-5 md:pb-0">
          <input
            ref="inputText"
            type="text"
            class="inputStyle rounded-[60px] py-2 px-4 w-full text-[#188E6B] font-700 md:bg-[#f0f0f0]"
            placeholder="想要去哪?"
            v-model="travelName"
          />
          <button @click="searchTravel(travelName)">
            <img
              src="../assets/images/icon/search.svg"
              alt="search"
              class="absolute right-4 top-[10px]"
            />
          </button>
        </div>
        <ul class="flex flex-wrap gap-x-3 gap-y-5 justify-center">
          <li>
            <router-link
              :to="{ name: 'viewList' }"
              class="flex gap-x-2 py-3 px-5 rounded-[62px] bg-[#FFF] font-700 text-[#616161] border-1 border-solid border-[#1Fb588] hover:bg-[#DAF9F0]"
            >
              找景點
              <img src="../assets/images/icon/tour-o.svg" alt="tour" />
            </router-link>
          </li>
          <!-- <li>
            <a
              href=""
              class="flex gap-x-2 py-3 px-5 rounded-[62px] bg-[#FFF] font-700 text-[#616161] border-1 border-solid border-[#1Fb588] hover:bg-[#DAF9F0]"
            >
              找飯店
              <img src="../assets/images/icon/bed-o.svg" alt="bed" />
            </a>
          </li>
          <li>
            <a
              href=""
              class="flex gap-x-2 py-3 px-5 rounded-[62px] bg-[#FFF] font-700 text-[#616161] border-1 border-solid border-[#1Fb588] hover:bg-[#DAF9F0]"
            >
              找餐廳
              <img src="../assets/images/icon/food-o.svg" alt="food" />
            </a>
          </li> -->
          <li>
            <router-link
              :to="authStore.user ? { name: 'myJourney' } : { name: 'login' }"
              class="flex gap-x-2 py-3 px-5 rounded-[62px] font-500 text-[#fff] bg-[#1FB588] hover:bg-[#588E6B]"
            >
              {{ authStore.user ? "我的旅程" : "登入" }}
            </router-link>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.inputStyle {
  &::placeholder {
    color: #808080;
    font-size: 12px;
    font-weight: 700;
  }
}
</style>

