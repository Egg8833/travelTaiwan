<script setup>
import { onMounted, ref, computed } from "vue";
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
</script>

<template>
  <div class="viewList">
    <div class="banner flex items-center"></div>
    <div class="max-w-[1200px] mx-auto pt-4 pb-10 xxl:max-w-[1400px]">
      <div
        class="flex justify-center items-center pb-8 px-5 md:justify-between"
      >
        <h2 class="text-[26px] text-[#188E6B] font-700 mr-2 md:text-[32px]">
          景點列表
        </h2>
        <div class="flex justify-center">
          <select
            name=""
            id=""
            class="w-[150px] rounded-10px py-2 px-3 border border-solid border-[#1Fb588] rounded-r-0 text-[#1Fb588] font-700"
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
            class="btn rounded-l-0 rounded-10px"
            @click="getSelectCityData"
          >
            查詢
          </button>
        </div>
      </div>

      <div class="px-4 flex flex-wrap gap-6 justify-center">
        <router-link
          v-for="data in renderData"
          :key="data.id"
          :to="`viewList/${data.id}`"
        >
          <card :cardData="data"></card>
        </router-link>
      </div>
      <div v-if="renderData.length === 0" class="px-5 text-center">
        <img
          src="../assets/images/no-results.png"
          alt="noResults"
          class="w-40 md:w-50 lg:w-60 mx-auto"
        />
        <p class="text-[#188E6B] font-700 text-[18px] mt-4">
          查無相關景點，請再次搜尋...
        </p>
      </div>
    </div>
  </div>
</template>

<style lang='scss'>
.viewList {
  .banner {
    background-image: url("../assets/images/tour-benner.png");
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    width: 100%;
    height: 72px;
  }
}

@media (min-width: 960px) {
  .viewList {
    .banner {
      height: 172px;
    }
  }
}

@media (min-width: 1024px) {
  .homeIndex {
  }
}
</style>

