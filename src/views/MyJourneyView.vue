<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import card from "@/components/card.vue";
import AccountSettingsPanel from "@/components/account/AccountSettingsPanel.vue";
import { useAuthStore } from "@/store/authStore.js";
import { useFavoriteStore } from "@/store/favoriteStore.js";
import { useReviewStore } from "@/store/reviewStore.js";
import { getReviewsApi } from "@/api/index.js";
import noImage from "@/assets/images/empty-img.png";

const authStore = useAuthStore();
const favoriteStore = useFavoriteStore();
const reviewStore = useReviewStore();
const router = useRouter();

const ratingsBySpotId = ref({});

const loadRatings = async (favorites) => {
  const entries = await Promise.all(
    favorites.map(async (fav) => {
      try {
        const reviews = await getReviewsApi(fav.spotId);
        if (reviews.length === 0) return [fav.spotId, 0];
        const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        return [fav.spotId, Math.round(average)];
      } catch (e) {
        console.error(e);
        return [fav.spotId, 0];
      }
    })
  );
  ratingsBySpotId.value = Object.fromEntries(entries);
};

onMounted(async () => {
  reviewStore.fetchMyReviewCount();
  await favoriteStore.fetchFavorites();
  loadRatings(favoriteStore.favoriteList);
});

const favoriteCount = computed(() => favoriteStore.favoriteList.length);

const logout = async () => {
  await authStore.logout();
  router.push({ name: "home" });
};

const toCardData = (fav) => {
  const photoSrc = [fav.pictureUrl].filter(Boolean);
  if (photoSrc.length === 0) {
    photoSrc.push(noImage);
  }
  return {
    id: fav.spotId,
    title: fav.spotName,
    photoSrc,
    tagText: [],
    startNum: ratingsBySpotId.value[fav.spotId] ?? 0,
  };
};
</script>

<template>
  <div class="max-w-[1000px] mx-auto py-10 px-6">
    <!-- 護照風格的個人資訊卡 -->
    <div
      class="boarding-pass shadow024 rounded-[16px] bg-white flex flex-col md:flex-row mb-10 overflow-hidden"
    >
      <div class="flex-1 flex items-center gap-4 p-6">
        <img
          v-if="authStore.user?.photoURL"
          :src="authStore.user.photoURL"
          class="w-16 h-16 rounded-full object-cover border-2 border-solid border-[#28DAA5]"
          alt="avatar"
        />
        <div
          v-else
          class="w-16 h-16 rounded-full bg-[#1FB588] flex items-center justify-center text-[#fff] text-[22px] font-700"
        >
          {{ (authStore.user?.displayName || "旅").charAt(0) }}
        </div>
        <div class="min-w-0">
          <p class="eyebrow text-[#1FB588] text-[12px] font-700 tracking-widest mb-1">
            旅人護照
          </p>
          <p class="font-700 text-[20px] text-[#434343] truncate">
            {{ authStore.user?.displayName || "旅人" }}
          </p>
          <p class="text-[#808080] text-[14px] truncate">{{ authStore.user?.email }}</p>
        </div>
      </div>

      <div
        class="stub flex items-center justify-between md:flex-col md:justify-center gap-4 px-6 py-4 md:w-[180px]"
      >
        <div class="flex gap-6 md:gap-4 md:flex-col">
          <div class="flex items-center gap-2">
            <p class="text-[12px] text-[#188E6B]">收藏景點</p>
            <p class="text-[28px] font-700 text-[#188E6B] leading-none">
              {{ favoriteCount }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <p class="text-[12px] text-[#188E6B]">撰寫評論</p>
            <p class="text-[28px] font-700 text-[#188E6B] leading-none">
              {{ reviewStore.myReviewCount }}
            </p>
          </div>
        </div>
        <button
          class="py-2 px-5 rounded-[62px] border-1 border-solid border-[#1Fb588] text-[#616161] font-700 whitespace-nowrap"
          @click="logout"
        >
          登出
        </button>
      </div>
    </div>

    <AccountSettingsPanel />

    <section>
      <h2 class="text-[20px] font-700 text-[#434343] mb-4 flex items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="shrink-0">
          <path
            d="M12 21s-7.5-4.8-10-9.3C.4 8.6 2 4.5 6 4c2.3-.3 4.3.9 6 3 1.7-2.1 3.7-3.3 6-3 4 .5 5.6 4.6 4 7.7C19.5 16.2 12 21 12 21Z"
            fill="#1FB588"
          />
        </svg>
        我的收藏
      </h2>

      <div
        v-if="favoriteStore.favoriteList.length === 0"
        class="empty-state rounded-[16px] border-1 border-dashed border-[#c9e9de] bg-[#F3FBF8] py-14 px-6 text-center"
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" class="mx-auto mb-3">
          <circle cx="12" cy="12" r="9" stroke="#28DAA5" stroke-width="1.6" />
          <path d="m14.5 9.5-2 5.5-2.5-3 5.5-2Z" fill="#28DAA5" />
        </svg>
        <p class="text-[#808080] mb-4">還沒有收藏任何景點，快去挑幾個放進口袋名單吧！</p>
        <router-link :to="{ name: 'viewList' }" class="btn inline-block">
          去找景點
        </router-link>
      </div>

      <div v-else class="flex flex-wrap gap-4">
        <router-link
          v-for="fav in favoriteStore.favoriteList"
          :key="fav.spotId"
          :to="`/viewList/${fav.spotId}`"
        >
          <card :cardData="toCardData(fav)"></card>
        </router-link>
      </div>
    </section>
  </div>
</template>

<style scoped>
.boarding-pass {
  border: 1px solid #eee;
}

.stub {
  background: #f3fbf8;
  position: relative;
}

@media (min-width: 768px) {
  .stub {
    border-left: 1px dashed #c9e9de;
  }
}

@media (max-width: 767px) {
  .stub {
    border-top: 1px dashed #c9e9de;
  }
}

.eyebrow {
  letter-spacing: 0.1em;
}
</style>
