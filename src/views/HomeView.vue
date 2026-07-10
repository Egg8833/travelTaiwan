<script setup>
import { computed, ref } from "vue";
import mainMv from "@/components/homeView/mainMv.vue";
import HotView from "@/components/homeView/HotView.vue";
import HotCheckInPoint from "@/components/homeView/HotCheckInPoint.vue";
import { storeToRefs } from "pinia";
import { useHomeViewStore } from "@/store/homeViewStore";

const homeViewStore = useHomeViewStore();
const { travelName, randomThreeItems } = storeToRefs(homeViewStore);
const { searchTravel } = homeViewStore;


const clickViewPoint = () => {
  travelName.value = "楓";
  searchTravel(travelName.value);
};
</script>

<template>
  <div class="homeIndex">
    <!-- banner首頁 -->
    <div class="banner flex items-center justify-center flex-col">
      <h1
        class="wow animate__zoomIn title-text text-center text-[40px] text-[#fefefe] leading-11 mb-5"
        data-wow-duration="1s"
      >
        開始實現
        <br class="md:hidden" />
        你的夢想旅程
      </h1>
      <div
        class="wow animate__bounceIn relative pb-5 max-w-[410px]"
        data-wow-duration="1s"
      >
        <input
          type="text"
          class="inputStyle rounded-[60px] py-2 px-4 bg-[f0f0f0] text-[#188E6B] font-700 md:w-320px md:py-5 md:placeholder:text-[16px]"
          placeholder="想要去哪?"
          v-model="travelName"
        />
        <button @click="searchTravel(travelName)">
          <img
            src="../assets/images/icon/search.svg"
            alt="search"
            class="absolute right-4 top-[10px] md:top-3 md:w-8"
          />
        </button>
      </div>
    </div>

    <HotView></HotView>
    <!-- 注目景點 -->
    <div class="viewPoint flex flex-col items-center justify-center">
      <h3
        class="text-center pt-[110px] pb-5 text-[36px] text-[#fefefe] font-700 leading-11"
      >
        你不能錯過的
        <br class="md:hidden" />
        注目景點!
      </h3>
      <button class="btn mb-[104px]" @click="clickViewPoint">
        賞楓秘境看這裡
      </button>
    </div>

    <!-- life -->
    <HotCheckInPoint :data="randomThreeItems"></HotCheckInPoint>

    <!-- mv -->
    <div class="py-4">
      <h2 class="text-center text-[30px] text-[#188E6B] font-700 pb-4">
        看見台灣的美
      </h2>
      <main-mv></main-mv>
      <p class="text-right text-[14px] pt-2 text-[#188E6B]">
        影片來源:看見 ‧ 齊柏林基金會
      </p>
    </div>

    <!-- 聽他們介紹旅遊行程 -->
    <!-- <div>
      <h2 class="pb-6 text-center text-[30px] text-[#188E6B] font-700">
        看達人怎麼玩
      </h2>
    </div> -->
  </div>
</template>

<style lang='scss'>
.homeIndex {
  .banner {
    background-image: url("../assets/images/home-benner.png");
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    width: 100%;
    height: calc(100dvh - 54px);
  }
  .title-text {
    text-shadow: 0px 2px 10px rgba(128, 128, 128, 0.7);
  }

  .viewPoint {
    background-image: url("../assets/images/theme-benner.png");
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }
}

@media (min-width: 960px) {
  .homeIndex {
    .banner {
      height: calc(100dvh - 82px);
    }
  }
}

@media (min-width: 1024px) {
  .homeIndex {
  }
}
</style>

