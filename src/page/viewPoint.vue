<script setup>
import { computed, onMounted, ref, watch } from "vue";
import card from "../components/card.vue";
import satisfaction from "../components/satisfaction.vue";
import ArticleToggle from "../components/ArticleToggle.vue";
import StarRatingInput from "../components/StarRatingInput.vue";
import { useRoute, useRouter } from "vue-router";

import { getImagePath } from "@/common/useImage";
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

const noServe = () => {
  alert("此服務尚未開啟,敬請期待");
};

const moveToNewViewPoint = (id) => {
  viewListId.value = id;
  loadViewData(id);
  refreshRandomItems();
  reviewStore.fetchReviews(id);
};
</script>

<template>
  <div v-if="renderViewData" class="max-w-[1232px] mx-auto overflow-hidden">
    <div class="pt-3 px-6 xl:px-4">
      <!-- 麵包屑 -->
      <router-link to="/viewList" class="group flex items-center mb-2 md:mb-3">
        <img src="../assets/images/icon/arrow-left.svg" alt="arrow" />
        <p class="ml-2 text-[#808080] font-700 group-hover:text-[#1fb588]">
          景點列表
        </p>
      </router-link>

      <div class="flex justify-between items-center mb-1 md:mb-3">
        <h4 class="text-[#434343] font-700 text-[18px] md:text-[46px]">
          {{ renderViewData.title }}
        </h4>
        <div class="flex gap-2">
          <a
            v-if="renderViewData.phone"
            :href="`tel:${dialPhone}`"
            class="flex items-center justify-center w-[30px] h-[30px] rounded-full border-1 border-solid border-[#1Fb588]"
          >
            <img
              src="../assets/images/icon/phone-filled.svg"
              alt="phone"
              class="w-[18px]"
            />
          </a>
          <a
            v-if="renderViewData.websiteUrl"
            :href="renderViewData.websiteUrl"
            target="_blank"
            rel="noopener"
            class="flex items-center justify-center w-[30px] h-[30px] rounded-full border-1 border-solid border-[#1Fb588]"
          >
            <img
              src="../assets/images/icon/web.svg"
              alt="web"
              class="w-[18px]"
            />
          </a>
          <div
            class="flex items-center justify-center w-[30px] h-[30px] rounded-full border-1 border-solid border-[#1Fb588] cursor-pointer"
            @click="toggleFavoriteOnPage"
          >
            <img
              :src="isFavorited ? heartFilled : heartOutline"
              alt="heart"
              class="w-[18px]"
            />
          </div>
        </div>
      </div>
      <div class="flex justify-between items-center mb-2">
        <satisfaction
          :startNum="Math.round(averageRating)"
          :commit="true"
          :commitNum="reviewStore.reviews.length"
        ></satisfaction>
        <p class="text-[#808080] w-30 md:w-unset">
          {{ renderViewData.Address || " " }}
        </p>
      </div>
      <div class="flex gap-1 mb-2 md:mb-6">
        <button
          v-for="(item, index) in renderViewData['tagText']"
          :key="index"
          class="tag"
        >
          {{ item }}
        </button>
      </div>

      <!-- 圖片輪播 -->
      <div class="md:flex md:justify-between">
        <div class="-mx-6 md:w-[60%] md:order-1 md:mx-0">
          <div class="relative">
            <img
              :src="getImagePath(renderViewData['photoSrc'])"
              class="w-full object-cover"
            />
            <div
              class="flex justify-center gap-2 absolute bottom-4 left-0 right-0"
            >
              <!-- <button
                v-for="(item, index) in 3"
                :key="index"
                class="w-[10px] h-[10px] rounded-full bg-[#FFF]"
              ></button> -->
            </div>
          </div>
        </div>
        <div class="pt-7 md:w-[35%] md:pt-0">
          <div class="grid gap-y-7">
            <div>
              <h4
                class="text-[#188E6B] font-700 text-[24px] pb-2 md:text-[32px]"
              >
                關於
              </h4>
              <ArticleToggle
                class="text-[#616161 font-500 leading-5 md:text-[18px] leading-6"
                :content="renderViewData['description']"
                :maxSummaryWordCount="150"
              ></ArticleToggle>
            </div>

            <div>
              <h4
                class="text-[#188E6B] font-700 text-[24px] pb-2 md:text-[32px]"
              >
                開放時間
              </h4>

              <ArticleToggle
                v-if="renderViewData['openTime']"
                class="text-[#616161 font-500 leading-5 md:text-[18px] leading-6"
                :content="renderViewData['openTime']"
                :maxSummaryWordCount="120"
              ></ArticleToggle>
              <p v-else>全日開放，依各店家營業時間為主。</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 景點特色 -->
      <div class="pt-8 grid gap-8">
        <div>
          <h4 class="text-[#188E6B] font-700 text-[24px] pb-2 md:text-[32px]">
            聯絡資訊
          </h4>
          <ul class="flex gap-2 flex-col">
            <li v-if="renderViewData.phone" class="flex items-center gap-2">
              <span>電話：</span>
              <a :href="`tel:${dialPhone}`" class="text-[#1FB588] underline">{{ renderViewData.phone }}</a>
            </li>
            <li v-if="renderViewData.websiteUrl" class="flex items-center gap-2">
              <span>官網：</span>
              <a :href="renderViewData.websiteUrl" target="_blank" rel="noopener" class="text-[#1FB588] underline">官方網站</a>
            </li>
            <li class="flex items-center gap-2">
              <span>停車資訊：</span>
              <span>{{ renderViewData.hasParking ? "有停車資訊" : "無停車資訊" }}</span>
            </li>
          </ul>
        </div>
        <!-- 交通方式 -->
        <!-- <div>
          <h4 class="text-[#188E6B] font-700 text-[24px] pb-3 md:text-[32px]">
            交通方式
          </h4>
          <div class="flex items-center bg-[#f0f0f0] justify-center py-2">
            <img src="../assets/images/icon/bus.svg" alt="" />
            <p class="ml-3 text-[#808080] text-[18px] font-700 md:text-[24px]">
              大眾運輸
            </p>
          </div>

          <div class="md:flex">
            <div
              class="p-9 border-b border-b-solid border-[#eee] md:border-b-0 md:border-r-solid md:border-r"
            >
              <div class="flex justify-center items-center flex-col">
                <div
                  class="py-2 px-2 text-[12px] rounded-[20px] bg-[#808080] text-white mb-2 inline-block"
                >
                  公車
                </div>
                <p class="mb-3 text-center leading-5 md:text-lg">
                  搭乘982、307等路線，至板橋站站牌，往中山路步行五分鐘即可抵達
                </p>

                <button
                  class="flex items-center btn-secondary"
                  @click="noServe"
                >
                  查看車次即時動態
                  <img
                    src="../assets/images/icon/bus-filled.svg"
                    alt=""
                    class="ml-2"
                  />
                </button>
              </div>
            </div>
            <div
              class="p-9 border-b border-b-solid border-[#eee] md:border-b-0 md:border-r-solid md:border-r"
            >
              <div class="flex justify-center items-center flex-col">
                <div
                  class="py-2 px-2 text-[12px] rounded-[20px] bg-[#808080] text-white mb-2 inline-block"
                >
                  火車、高鐵
                </div>
                <p class="mb-3 text-center leading-5 md:text-lg">
                  搭至板橋站，往中山路步行五分鐘即可抵達
                </p>

                <button
                  class="flex items-center btn-secondary"
                  @click="noServe"
                >
                  查看車次即時動態
                  <img
                    src="../assets/images/icon/train-filled.svg"
                    alt=""
                    class="ml-2"
                  />
                </button>
              </div>
            </div>
            <div class="p-9">
              <div class="flex justify-center items-center flex-col">
                <div
                  class="py-2 px-2 text-[12px] rounded-[20px] bg-[#808080] text-white mb-2 inline-block"
                >
                  捷運
                </div>
                <p class="mb-3 text-center leading-5 md:text-lg">
                  搭至板橋站，往中山路步行五分鐘即可抵達
                </p>

                <button
                  class="flex items-center btn-secondary"
                  @click="noServe"
                >
                  查看車次即時動態
                  <img
                    src="../assets/images/icon/mrt-filled.svg"
                    alt=""
                    class="ml-2"
                  />
                </button>
              </div>
            </div>
          </div>
        </div> -->
      </div>

      <!-- 評價 -->
      <div class="mt-5">
        <div>
          <h4 class="text-[#188E6B] font-700 text-[24px] pb-4 md:text-[32px]">
            旅客評價
          </h4>
          <div class="flex items-center gap-2">
            <p class="text-[30px] text-[#434343] font-700">{{ averageRating || "–" }}</p>
            <satisfaction
              :startNum="Math.round(averageRating)"
              :commit="true"
              :commitNum="reviewStore.reviews.length"
            ></satisfaction>
          </div>
        </div>

        <div class="pt-6 pb-6 border-b border-b-solid border-[#eee]">
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

        <div>
          <div v-for="review in reviewStore.reviews" :key="review.id">
            <div class="pt-4 flex items-end">
              <div class="w-10 h-10 rounded-full bg-[#208080]"></div>
              <p class="ml-2 text-[18px] font-700 text-[#434343]">
                {{ review.authorName }}
              </p>
              <div class="ml-auto">
                <satisfaction :startNum="review.rating"></satisfaction>
              </div>
            </div>
            <div class="pt-4 pb-6 border-b border-b-solid border-[#eee]">
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
                <p class="leading-6">{{ review.content }}</p>
                <div v-if="authStore.user?.uid === review.uid" class="flex gap-2 mt-2">
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

        <div class="pb-10">
          <h4 class="text-[#188E6B] font-700 text-[24px] pb-4 md:text-[32px]">
            這些景點大家也推薦
          </h4>
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
      </div>
    </div>
  </div>
</template>

<style>
</style>

