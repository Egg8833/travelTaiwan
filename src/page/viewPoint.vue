<script setup>
import { computed, onMounted, ref, watch } from "vue";
import card from "../components/card.vue";
import satisfaction from "../components/satisfaction.vue";
import ArticleToggle from "../components/ArticleToggle.vue";
import { useRoute } from "vue-router";

import { getImagePath } from "@/common/useImage";
import { storeToRefs } from "pinia";
import { useHomeViewStore } from "@/store/homeViewStore";
import processViewData from "@/common/processList.js";
import { getViewByIdApi } from "@/api/index.js";
const homeViewStore = useHomeViewStore();
const { filteredData, haveSearchTravel, randomThreeItems } =
  storeToRefs(homeViewStore);
const { refreshRandomItems } = homeViewStore;

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

const commitList = ref([
  {
    title: "不錯的景點",
    txt: "風景好視野開闊，看海看山看夕陽。黃昏時分人潮眾多。休閒放鬆的好去處。",
  },
  {
    title: "悠閒放鬆的好地方",
    txt: "若有閒暇時間，非常適合放慢腳步，坐於岸邊品嚐各式美食，享受一下晝與夜的美景。",
  },
  {
    title: "人潮多，避開人群",
    txt: "建議平日造訪，假日太多人，旅遊品質會下降。平日早訪，會有比較好的旅遊品質",
  },
]);

const noServe = () => {
  alert("此服務尚未開啟,敬請期待");
};

const moveToNewViewPoint = (id) => {
  viewListId.value = id;
  loadViewData(id);
  refreshRandomItems();
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
          <div
            class="flex items-center justify-center w-[30px] h-[30px] rounded-full border-1 border-solid border-[#1Fb588]"
          >
            <img
              src="../assets/images/icon/phone-filled.svg"
              alt="phone"
              class="w-[18px]"
            />
          </div>
          <div
            class="flex items-center justify-center w-[30px] h-[30px] rounded-full border-1 border-solid border-[#1Fb588]"
          >
            <img
              src="../assets/images/icon/web.svg"
              alt="web"
              class="w-[18px]"
            />
          </div>
          <div
            class="flex items-center justify-center w-[30px] h-[30px] rounded-full border-1 border-solid border-[#1Fb588]"
          >
            <img
              src="../assets/images/icon/heart-outline.svg"
              alt="heart"
              class="w-[18px]"
            />
          </div>
        </div>
      </div>
      <div class="flex justify-between items-center mb-2">
        <satisfaction
          :startNum="3"
          :commit="true"
          :commitNum="234"
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
            服務設施
          </h4>
          <ul class="flex gap-2 flex-col">
            <li class="flex items-center gap-2">
              <span>服務處</span>
              <img src="../assets/images/icon/check.svg" alt="" />
            </li>
            <li class="flex items-center gap-2">
              <span>公共廁所</span>
              <img src="../assets/images/icon/check.svg" alt="" />
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
            <p class="text-[30px] text-[#434343] font-700">3</p>
            <satisfaction
              :startNum="3"
              :commit="true"
              :commitNum="234"
            ></satisfaction>
            <div
              class="ml-auto flex items-center justify-center w-[32px] h-[32px] rounded-full border-1 border-solid border-[#1Fb588]"
            >
              <img
                src="../assets/images/icon/sort.svg"
                alt=""
                class="w-[18px] h-[18px]"
              />
            </div>
          </div>
        </div>
        <div>
          <!-- 評價區塊 -->
          <div v-for="(i, index) in commitList" :key="i">
            <div class="pt-4 flex items-end">
              <img
                src="../assets/images/people.png"
                alt=""
                v-if="index === 0"
              />
              <div
                v-if="index !== 0"
                class="w-10 h-10 rounded-full bg-[#208080]"
              ></div>
              <p class="ml-2 text-[18px] font-700 text-[#434343]">
                {{ i.title }}
              </p>
              <div class="ml-auto">
                <satisfaction :startNum="3"></satisfaction>
              </div>
            </div>
            <div
              class="pt-4 pb-6 border-b border-b-solid border-[#eee]"
              :class="{ 'border-b-0': index + 1 === 3 }"
            >
              <p class="leading-6">
                {{ i.txt }}
              </p>
            </div>
          </div>
          <div class="flex justify-center pt-7 pb-10">
            <button class="btn" @click="noServe">查看更多</button>
          </div>
        </div>
        <div class="pb-10">
          <h4 class="text-[#188E6B] font-700 text-[24px] pb-4 md:text-[32px]">
            這些景點大家也推薦
          </h4>
          <div
            class="flex justify-center flex-col gap-4 items-center md:grid md:grid-cols-3 md:gap-6"
          >
            <!-- v-for="data in randomThreeItems" -->
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

