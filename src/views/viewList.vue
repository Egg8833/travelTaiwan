<script setup>
import { onMounted, ref, computed } from "vue";
import { useWindowScroll, useWindowSize } from "@vueuse/core";
import card from "@/components/card.vue";
import cityListData from "@/assets/data/cityList.json";

import { storeToRefs } from "pinia";
import { useViewListStore } from "@/store/viewStore";
import { useHomeViewStore } from "@/store/homeViewStore";

// const renderData = ref([]);

const homeViewStore = useHomeViewStore();
const { filteredData, haveSearchTravel, travelName } =
  storeToRefs(homeViewStore);
// const {} = homeViewStore;

const viewListStore = useViewListStore();
const { viewData } = storeToRefs(viewListStore);
const { getViewsStoreData, setCityName } = viewListStore;

const cityList = cityListData.map((item) => {
  return {
    cityCode: item.CityCode,
    cityName: item.CityName,
    cityEnName: item.City,
  };
});
const selectCity = ref("選擇地區");

const getSelectCityData = () => {
  haveSearchTravel.value = false;
  travelName.value = "";
  if (selectCity.value === "選擇地區") {
    alert("請選擇地區");
    return;
  }
  setCityName(selectCity.value);
  getViewsStoreData();
};

onMounted(() => {
  if (!haveSearchTravel.value) {
    getViewsStoreData();
  }
});

const renderData = computed(() =>
  haveSearchTravel.value ? filteredData.value : viewData.value
);

const selectedCityLabel = computed(() => {
  const found = cityList.find(item => item.cityEnName === selectCity.value);
  return found ? found.cityName : "全部地區";
});

const resetFilter = () => {
  selectCity.value = "選擇地區";
  haveSearchTravel.value = false;
  travelName.value = "";
  getViewsStoreData();
};

const { y: scrollY } = useWindowScroll();
const { height: windowHeight } = useWindowSize();
const showBackToTop = computed(() => scrollY.value > 400);
// 接近頁面底部（footer 快出現）時，改成貼在內容區底部，避免蓋到 footer
const isNearBottom = computed(() => {
  const doc = document.documentElement;
  return scrollY.value + windowHeight.value >= doc.scrollHeight - 220;
});
const scrollToTop = () => window.scrollTo({top: 0, behavior: "smooth"});
</script>

<template>
  <div class="viewList">
    <div class="banner flex items-end">
      <div class="max-w-[1200px] w-full mx-auto px-6 pb-6 md:pb-10 xxl:max-w-[1400px]">
        <p class="eyebrow text-[#DAF9F0] text-[12px] font-700 tracking-widest mb-2">
          探索台灣
        </p>
        <h1 class="title-text text-[28px] md:text-[40px] text-[#fefefe] font-700 leading-tight">
          景點列表
        </h1>
      </div>
    </div>
    <!-- 浮貼在banner下緣的篩選卡片 -->
    <div class="relative z-10 max-w-[820px] mx-auto px-6 -mt-8 md:-mt-10">
      <div
        class="filter-card shadow024 bg-white rounded-[16px] px-6 py-5 flex flex-col md:flex-row md:items-center gap-4"
      >
        <div class="flex items-center gap-2 text-[#434343] font-700 shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="shrink-0">
            <path
              d="M12 21s-7.5-4.8-10-9.3C.4 8.6 2 4.5 6 4c2.3-.3 4.3.9 6 3 1.7-2.1 3.7-3.3 6-3 4 .5 5.6 4.6 4 7.7C19.5 16.2 12 21 12 21Z"
              fill="#1FB588"
            />
          </svg>
          依地區搜尋
        </div>
        <div class="flex flex-1 gap-3">
          <select
            name=""
            id=""
            class="flex-1 md:w-[180px] rounded-10px py-2 px-3 border border-solid border-[#eee] rounded-r-0 text-[#1Fb588] font-700"
            v-model="selectCity"
          >
            <option value="選擇地區" selected>選擇地區</option>
            <option
              :value="item.cityEnName"
              v-for="item in cityList"
              :key="item"
            >
              {{ item.cityName }}
            </option>
          </select>
          <button
            class="btn-accent rounded-l-0 rounded-10px whitespace-nowrap"
            @click="getSelectCityData"
          >
            查詢
          </button>
        </div>
      </div>
    </div>

    <div class="max-w-[1200px] mx-auto pt-10 pb-16 xxl:max-w-[1400px]">
      <p class="px-5 mb-6 text-[#808080] text-[14px]">
        {{ selectedCityLabel }} · 共 {{ renderData.length }} 個景點
      </p>

      <div class="px-4 flex flex-wrap gap-6 justify-center md:justify-start">
        <router-link
          v-for="data in renderData"
          :key="data.id"
          :to="`viewList/${data.id}`"
        >
          <card :cardData="data"></card>
        </router-link>
      </div>
      <div v-if="renderData.length === 0" class="empty-state mx-4 rounded-[16px] border-1 border-dashed border-[#c9e9de] bg-[#F3FBF8] py-16 px-6 text-center">
        <img
          src="../assets/images/no-results.png"
          alt="noResults"
          class="w-40 md:w-50 lg:w-60 mx-auto"
        />
        <p class="text-[#188E6B] font-700 text-[18px] mt-4 mb-4">
          查無相關景點，換個地區找找看吧！
        </p>
        <button class="btn-secondary" @click="resetFilter">
          清除篩選，看看全部景點
        </button>
      </div>
    </div>

    <Transition name="fade-scale">
      <button
        v-if="showBackToTop"
        class="back-to-top right-6 bottom-6 md:right-10 md:bottom-10 z-20 w-12 h-12 rounded-full bg-[#1FB588] shadow024 flex items-center justify-center"
        :class="isNearBottom ? 'absolute' : 'fixed'"
        aria-label="回到頂部"
        @click="scrollToTop"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 19V5M12 5l-6 6M12 5l6 6"
            stroke="#fff"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </Transition>
  </div>
</template>

<style lang='scss'>
.viewList {
  position: relative;
  background: #fafcfb;

  .banner {
    background-image: linear-gradient(180deg, rgba(19, 46, 38, 0.15) 0%, rgba(19, 46, 38, 0.75) 100%),
      url("../assets/images/tour-benner.png");
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    width: 100%;
    height: 140px;
  }

  .title-text {
    text-shadow: 0px 2px 10px rgba(0, 0, 0, 0.4);
  }

  .back-to-top {
    transition: background-color 0.2s ease, transform 0.2s ease;

    &:hover {
      background-color: #188e6b;
      transform: translateY(-2px);
    }
  }
}

@media (min-width: 960px) {
  .viewList {
    .banner {
      height: 220px;
    }
  }
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.9);
}
</style>

