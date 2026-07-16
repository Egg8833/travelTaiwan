<script setup>
import { computed, onMounted, ref, watch } from "vue";
import card from "../components/card.vue";
import satisfaction from "../components/satisfaction.vue";
import ArticleToggle from "../components/ArticleToggle.vue";
import StarRatingInput from "../components/StarRatingInput.vue";
import { useRoute, useRouter } from "vue-router";

import { getImagePath } from "@/common/useImage";
import { displayAuthorName, avatarColor, avatarInitial } from "@/common/reviewDisplay.js";
import { storeToRefs } from "pinia";
import { useHomeViewStore } from "@/store/homeViewStore";
import { useAuthStore } from "@/store/authStore";
import { useFavoriteStore } from "@/store/favoriteStore";
import { useReviewStore } from "@/store/reviewStore";
import processViewData from "@/common/processList.js";
import { getViewByIdApi } from "@/api/index.js";
import heartOutline from "../assets/images/icon/heart-outline.svg";
import heartFilled from "../assets/images/icon/heart-filled.svg";

const homeViewStore = useHomeViewStore();
const { randomThreeItems } =
  storeToRefs(homeViewStore);
const { refreshRandomItems } = homeViewStore;

const authStore = useAuthStore();
const favoriteStore = useFavoriteStore();
const reviewStore = useReviewStore();
const router = useRouter();

// 優化建議 進入頁面後把資料存入到localstrorage

const route = useRoute();
const viewListId = ref(route.path.split("/").pop());
const renderViewData = ref(null);

const loadViewData = async (id) => {
  try {
    const data = await getViewByIdApi(id);
    renderViewData.value = processViewData([data])[0];
  } catch (e) {
    alert("查無相關景點資訊");
  }
};
loadViewData(viewListId.value);
reviewStore.fetchReviews(viewListId.value);

const isFavorited = computed(() =>
  renderViewData.value ? favoriteStore.favoriteIds.has(renderViewData.value.id) : false
);

const dialPhone = computed(() => {
  const phone = renderViewData.value?.phone;
  if (!phone) return null;
  return phone.split(/[、,，;；]/)[0].trim();
});

const toggleFavoriteOnPage = () => {
  if (!authStore.user) {
    router.push({ name: "login" });
    return;
  }
  favoriteStore.toggleFavorite(renderViewData.value);
};

const averageRating = computed(() => {
  if (reviewStore.reviews.length === 0) return 0;
  const sum = reviewStore.reviews.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / reviewStore.reviews.length) * 10) / 10;
});

const newReviewRating = ref(0);
const newReviewContent = ref("");

const submitReview = async () => {
  if (newReviewRating.value === 0) {
    alert("請選擇星等");
    return;
  }
  if (!newReviewContent.value.trim()) {
    alert("請輸入評論內容");
    return;
  }
  const ok = await reviewStore.addReview(viewListId.value, {
    rating: newReviewRating.value,
    content: newReviewContent.value,
    authorName: authStore.user?.displayName || authStore.user?.email?.split("@")[0],
  });
  if (ok) {
    newReviewRating.value = 0;
    newReviewContent.value = "";
  }
};

const editingReviewId = ref(null);
const editRating = ref(0);
const editContent = ref("");

const startEdit = (review) => {
  editingReviewId.value = review.id;
  editRating.value = review.rating;
  editContent.value = review.content;
};

const cancelEdit = () => {
  editingReviewId.value = null;
};

const saveEdit = async (reviewId) => {
  const ok = await reviewStore.updateReview(viewListId.value, reviewId, {
    rating: editRating.value,
    content: editContent.value,
  });
  if (ok) editingReviewId.value = null;
};

const removeReview = async (reviewId) => {
  if (!confirm("確定要刪除這則評論嗎？")) return;
  await reviewStore.deleteReview(viewListId.value, reviewId);
};

const moveToNewViewPoint = (id) => {
  viewListId.value = id;
  loadViewData(id);
  refreshRandomItems();
  reviewStore.fetchReviews(id);
};

const formatReviewDate = (isoString) => {
  if (!isoString) return "";
  const diffDays = Math.floor((Date.now() - new Date(isoString).getTime()) / 86400000);
  if (diffDays <= 0) return "今天";
  if (diffDays === 1) return "昨天";
  if (diffDays < 30) return `${diffDays} 天前`;
  return new Date(isoString).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" });
};
</script>

<template>
  <div v-if="renderViewData" class="max-w-[1232px] mx-auto">
    <div class="pt-3 px-6 xl:px-4">
      <!-- 麵包屑 -->
      <router-link to="/viewList" class="group flex items-center mb-4">
        <img src="../assets/images/icon/arrow-left.svg" alt="arrow" />
        <p class="ml-2 text-[#808080] font-700 group-hover:text-[#1fb588]">
          景點列表
        </p>
      </router-link>

      <!-- Hero 圖片 -->
      <div class="relative rounded-[16px] shadow024 overflow-hidden">
        <img
          :src="getImagePath(renderViewData['photoSrc'])"
          class="w-full h-[240px] md:h-[420px] object-cover"
        />
        <button
          class="absolute top-4 right-4 flex items-center justify-center w-11 h-11 bg-white rounded-full border-1 border-solid border-[#28DAA5] cursor-pointer"
          @click="toggleFavoriteOnPage"
        >
          <img :src="isFavorited ? heartFilled : heartOutline" alt="heart" class="w-5" />
        </button>
      </div>

      <div class="flex flex-col md:flex-row md:justify-between md:items-start mt-6 mb-1">
        <h1 class="text-[#434343] font-700 text-[24px] md:text-[40px] leading-tight">
          {{ renderViewData.title }}
        </h1>
        <satisfaction
          class="mt-2 md:mt-2 shrink-0"
          :startNum="Math.round(averageRating)"
          :commit="true"
          :commitNum="reviewStore.reviews.length"
        ></satisfaction>
      </div>
      <div class="flex gap-1 mb-8 flex-wrap">
        <button
          v-for="(item, index) in renderViewData['tagText']"
          :key="index"
          class="tag"
        >
          {{ item }}
        </button>
      </div>

      <!-- 主要內容：文章 + 側邊資訊卡 -->
      <div class="md:flex md:gap-10 md:items-start">
        <div class="md:w-[62%] flex flex-col gap-10">
          <section>
            <h2 class="text-[#188E6B] font-700 text-[22px] pb-3 md:text-[26px]">
              關於
            </h2>
            <ArticleToggle
              class="text-[#616161] font-500 leading-6 md:text-[16px]"
              :content="renderViewData['description']"
              :maxSummaryWordCount="150"
            ></ArticleToggle>
          </section>

          <section>
            <h2 class="text-[#188E6B] font-700 text-[22px] pb-3 md:text-[26px]">
              開放時間
            </h2>
            <ArticleToggle
              v-if="renderViewData['openTime']"
              class="text-[#616161] font-500 leading-6 md:text-[16px]"
              :content="renderViewData['openTime']"
              :maxSummaryWordCount="120"
            ></ArticleToggle>
            <p v-else class="text-[#616161]">全日開放，依各店家營業時間為主。</p>
          </section>
        </div>

        <!-- 側邊資訊卡 -->
        <aside class="md:w-[38%] mt-10 md:mt-0">
          <div class="info-card shadow024 rounded-[16px] border border-solid border-[#eee] p-6 md:sticky md:top-24">
            <p class="text-[13px] font-700 text-[#1fb588] tracking-widest uppercase mb-4">
              景點資訊
            </p>
            <ul class="flex flex-col gap-4">
              <li v-if="renderViewData.Address" class="flex gap-3">
                <img src="../assets/images/icon/pin.svg" alt="" class="w-5 h-5 shrink-0 mt-[2px]" />
                <div>
                  <p class="text-[12px] text-[#a0a0a0] mb-1">地址</p>
                  <p class="text-[#434343]">{{ renderViewData.Address }}</p>
                </div>
              </li>
              <li v-if="renderViewData.phone" class="flex gap-3">
                <img src="../assets/images/icon/phone-filled.svg" alt="" class="w-5 h-5 shrink-0 mt-[2px]" />
                <div>
                  <p class="text-[12px] text-[#a0a0a0] mb-1">電話</p>
                  <a :href="`tel:${dialPhone}`" class="text-[#1FB588] font-700">{{ renderViewData.phone }}</a>
                </div>
              </li>
              <li v-if="renderViewData.websiteUrl" class="flex gap-3">
                <img src="../assets/images/icon/web.svg" alt="" class="w-5 h-5 shrink-0 mt-[2px]" />
                <div>
                  <p class="text-[12px] text-[#a0a0a0] mb-1">官網</p>
                  <a :href="renderViewData.websiteUrl" target="_blank" rel="noopener" class="text-[#1FB588] font-700 underline">官方網站</a>
                </div>
              </li>
              <li class="flex gap-3">
                <img src="../assets/images/icon/bed-o.svg" alt="" class="w-5 h-5 shrink-0 mt-[2px]" />
                <div>
                  <p class="text-[12px] text-[#a0a0a0] mb-1">停車資訊</p>
                  <p class="text-[#434343]">{{ renderViewData.hasParking ? "有停車資訊" : "無停車資訊" }}</p>
                </div>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      <!-- 評價 -->
      <section class="mt-14">
        <h2 class="text-[#188E6B] font-700 text-[22px] pb-4 md:text-[26px]">
          旅客評價
        </h2>

        <div class="pt-2 pb-6 border-b border-b-solid border-[#eee]">
          <div v-if="authStore.user">
            <p class="font-700 text-[#434343] mb-2">留下你的評論</p>
            <StarRatingInput v-model="newReviewRating" />
            <textarea
              v-model="newReviewContent"
              rows="3"
              class="w-full mt-2 rounded-[8px] border-1 border-solid border-[#eee] py-2 px-4"
              placeholder="分享你的旅遊心得..."
            ></textarea>
            <button class="btn mt-2" @click="submitReview">送出評論</button>
          </div>
          <div v-else>
            <router-link :to="{ name: 'login' }" class="text-[#1FB588] underline">
              登入後即可留言
            </router-link>
          </div>
        </div>

        <div class="flex flex-col gap-4 pt-6">
          <div
            v-for="review in reviewStore.reviews"
            :key="review.id"
            class="rounded-[16px] border border-solid border-[#eee] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-white font-700 text-[18px]"
                :style="{ backgroundColor: avatarColor(displayAuthorName(review.authorName)) }"
              >
                {{ avatarInitial(displayAuthorName(review.authorName)) }}
              </div>
              <div class="min-w-0">
                <p class="text-[16px] font-700 text-[#434343] truncate md:text-[18px]">
                  {{ displayAuthorName(review.authorName) }}
                </p>
                <p class="text-[13px] text-[#a0a0a0]">{{ formatReviewDate(review.createdAt) }}</p>
              </div>
              <div class="ml-auto shrink-0">
                <satisfaction :startNum="review.rating"></satisfaction>
              </div>
            </div>

            <div class="pt-3">
              <div v-if="editingReviewId === review.id">
                <StarRatingInput v-model="editRating" />
                <textarea
                  v-model="editContent"
                  rows="3"
                  class="w-full mt-2 rounded-[8px] border-1 border-solid border-[#eee] py-2 px-4"
                ></textarea>
                <div class="flex gap-2 mt-2">
                  <button class="btn" @click="saveEdit(review.id)">儲存</button>
                  <button class="btn-secondary" @click="cancelEdit">取消</button>
                </div>
              </div>
              <div v-else>
                <p class="leading-7 text-[#606060]">{{ review.content }}</p>
                <div v-if="authStore.user?.uid === review.uid" class="flex gap-3 mt-3">
                  <button class="text-[#1FB588] underline" @click="startEdit(review)">編輯</button>
                  <button class="text-[#EB5757] underline" @click="removeReview(review.id)">刪除</button>
                </div>
              </div>
            </div>
          </div>
          <p v-if="reviewStore.reviews.length === 0" class="text-[#808080] py-6">
            還沒有評論，成為第一個留言的人吧！
          </p>
        </div>
      </section>
    </div>

    <!-- 推薦景點：用淡底色跟上面內容做出區隔 -->
    <section class="mt-16 bg-[#F3FBF8] py-14">
      <div class="px-6 xl:px-4">
        <h2 class="text-[#188E6B] font-700 text-[22px] pb-6 md:text-[26px]">
          這些景點大家也推薦
        </h2>
        <div
          class="flex justify-center flex-col gap-4 items-center md:grid md:grid-cols-3 md:gap-6"
        >
          <router-link
            @click="moveToNewViewPoint(data.id)"
            v-for="data in randomThreeItems"
            :key="data.id"
            :to="`${data.id}`"
          >
            <card :cardData="data"></card>
          </router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<style>
</style>

