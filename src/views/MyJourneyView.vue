<script setup>
import {onMounted} from "vue";
import {useRouter} from "vue-router";
import card from "@/components/card.vue";
import AccountSettingsPanel from "@/components/account/AccountSettingsPanel.vue";
import {useAuthStore} from "@/store/authStore.js";
import {useFavoriteStore} from "@/store/favoriteStore.js";
import noImage from "@/assets/images/empty-img.png";

const authStore = useAuthStore();
const favoriteStore = useFavoriteStore();
const router = useRouter();

onMounted(() => {
  favoriteStore.fetchFavorites();
});

const logout = async () => {
  await authStore.logout();
  router.push({name: "home"});
};

const toCardData = fav => {
  const photoSrc = [fav.pictureUrl].filter(Boolean);
  if (photoSrc.length === 0) {
    photoSrc.push(noImage);
  }
  return {
    id: fav.spotId,
    title: fav.spotName,
    photoSrc,
    tagText: [],
    startNum: 0,
  };
};
</script>

<template>
  <div class="max-w-[1000px] mx-auto py-10 px-6">
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-4">
        <img
          v-if="authStore.user?.photoURL"
          :src="authStore.user.photoURL"
          class="w-14 h-14 rounded-full"
          alt="avatar"
        />
        <div v-else class="w-14 h-14 rounded-full bg-[#1FB588]"></div>
        <div>
          <p class="font-700 text-[18px] text-[#434343]">
            {{ authStore.user?.displayName || "旅人" }}
          </p>
          <p class="text-[#808080]">{{ authStore.user?.email }}</p>
        </div>
      </div>
      <button
        class="py-2 px-5 rounded-[62px] border-1 border-solid border-[#1Fb588] text-[#616161] font-700"
        @click="logout"
      >
        登出
      </button>
    </div>

    <AccountSettingsPanel />

    <h2 class="text-[20px] font-700 text-[#434343] mb-4">我的收藏</h2>
    <p v-if="favoriteStore.favoriteList.length === 0" class="text-[#808080]">
      還沒有收藏任何景點，去
      <router-link :to="{name: 'viewList'}" class="text-[#1FB588] underline">找景點</router-link>
      看看吧！
    </p>
    <div v-else class="flex flex-wrap gap-4">
      <router-link
        v-for="fav in favoriteStore.favoriteList"
        :key="fav.spotId"
        :to="`/viewList/${fav.spotId}`"
      >
        <card :cardData="toCardData(fav)"></card>
      </router-link>
    </div>
  </div>
</template>
