<script setup>
import { getHomeViewsApi } from "@/api/index.js";
import { computed, ref, watch, onMounted } from "vue";
import northMap from "@/assets/images/map_north.png";
import centerMap from "@/assets/images/map_center.png";
import southMap from "@/assets/images/map_south.png";
import eastMap from "@/assets/images/map_east.png";
import islandMap from "@/assets/images/map_island.png";
import { useWindowSize } from "@vueuse/core";
import { getImagePath } from "@/common/useImage";

const { width: deviceWidth } = useWindowSize();
const selectIndex = ref(0);
const viewPointData = [
  {
    text: [
      "「北部地區」包括臺北市、新北市、基隆市、宜蘭縣、桃園市、新竹縣及新竹市等7個縣市。您可以從臺灣最高樓——臺北101俯瞰臺北美景；前往故宮博物院一窺歷史典藏文物瑰寶；或走進知名老街如：九份、淡水、鶯歌、三峽等感受古街風情記憶。北部地區的自然風光令人驚嘆。陽明山國家公園擁有綿延的山川景色，四季變幻的美景吸引著許多登山健行愛好者前來探險。而九份老街則是一處充滿古早風情的小鎮，狹窄的巷弄中隱藏著許多特色店鋪，讓人仿若置身於時光隧道中。",
    ],
  },
  {
    text: [
      "「中部地區」包括苗栗縣、臺中市、彰化縣、南投縣及雲林縣等5個縣市，位於臺灣心臟地帶，常年氣候舒適，尤其是臺中市，四季氣溫宜人，非常適合旅行。中部地區擁有多處老少皆宜的渡假村及遊樂中心，包含苗栗西湖渡假村、臺中麗寶樂園、南投泰雅渡假村、九族文化村及雲林劍湖山世界等。喜歡文藝的朋友們不可錯過苗栗的木雕與燒陶藝術，可自己動手DIY實作體驗一番，臺中市國立臺灣美術館與自然科學博物館推薦遊客進入細細參觀，值得深入欣賞。",
    ],
  },
  {
    text: [
      "臺灣南部地區散發著濃厚的歷史文化，臺南市是全臺歷史最悠久的文化古都，十九世紀末期前，臺南一直是臺灣政治經濟文化重心，古蹟名勝特別多。嘉義縣因北回歸線通過而建造的「北回歸線天文廣場」，呈現北回歸線的地理象徵。阿里山森林遊樂區舉世聞名，高山森林鐵路及深藏不露的林間古道，吸引大批國內外遊客造訪，而阿里山雲海、日出、晚霞等自然美景，遠近馳名，是旅遊臺灣必遊的重點景點之一，值得好好深度旅遊的地點。",
    ],
  },
  {
    text: [
      "臺灣東部地區包含花蓮縣及臺東縣2個縣市，東臨浩瀚太平洋，西倚中央山脈，擁有臨山面海的優越地理位置，最初葡萄牙人航行經過臺灣東部海岸時，看見壯麗的山川美景呈現於眼前，驚呼「FORMOSA」（美極了），臺灣「福爾摩沙」的稱號由此而來，東部極致的天然美景也由此可見。東部地區擁有豐富的生態資源、悠久的農業文化和純樸善良的在地居民，是臺灣的「後花園」，非常適合慢活養生之旅，行走在這塊淨土上，放慢你的呼吸頻率。",
    ],
  },
  {
    text: [
      "臺灣主要島嶼之外，周邊的小島也為數可觀，澎湖、金門與連江三個縣市位於離島地區，原本曾神秘的軍事管制禁區——金門，開放觀光後成為熱絡的旅遊地區，具鄉土風味的金門特產三寶，鋼刀、貢糖、高粱酒，總讓人滿載而歸，而馬祖的老酒、八八坑道高粱、大麯酒，更令人齒頰留香。既是外島，各樣生鮮美饌種類繁多，讓遊客得以飽嘗頂級海鮮美味。澎湖，春夏花火節火樹銀花綻放熱情和浪漫，碧海藍天與柔白細緻沙灘的雙重享受，讓你盡情的享受水上世界。",
    ],
  },
];
const viewPointImg = [
  {
    src: northMap,
  },
  {
    src: centerMap,
  },
  {
    src: southMap,
  },
  {
    src: eastMap,
  },
  {
    src: islandMap,
  },
];

const viewArea = ["北部地區", "中部地區", "南部地區", "東部地區", "離島地區"];

const dataText = computed(() => viewPointData[selectIndex.value].text);
const dataImg = computed(() => viewPointImg[selectIndex.value].src);

const homeViewData = ref([]);
onMounted(async () => {
  try {
    homeViewData.value = await getHomeViewsApi();
  } catch (e) {
    console.error(e);
  }
});

const idx = ref(0);
const selectAreaData = computed(() => {
  const areaObj = homeViewData.value[selectIndex.value];
  return areaObj ? areaObj[viewArea[selectIndex.value]] : [];
});

watch(selectIndex, () => {
  idx.value = 0;
});
const maxIdx = computed(() => selectAreaData.value.length - 3);
const clickAreaIdx = (direction) => {
  if (direction === "left") {
    idx.value = Math.max(0, idx.value - 1);
  } else {
    idx.value = Math.min(idx.value + 1, maxIdx.value);
  }
};

const sliderStyle = computed(() => {
  return {
    transform: `translateX(${-216 * idx.value}px)
  `,
  };
});

watch(deviceWidth, () => {
  idx.value = 0;
});
</script>

<template>
  <div class="viewPointContainer py-15 overflow-hidden">
    <img
      src="@/assets/images/areaImg/spotBg_north.jpg"
      alt="spotBg"
      class="viewPointBg"
      v-show="selectIndex === 0"
    />
    <img
      src="@/assets/images/areaImg/spotBg_center.jpg"
      alt="spotBg"
      class="viewPointBg"
      v-show="selectIndex === 1"
    />
    <img
      src="@/assets/images/areaImg/spotBg_south.jpg"
      alt="spotBg"
      class="viewPointBg"
      v-show="selectIndex === 2"
    />
    <img
      src="@/assets/images/areaImg/spotBg_east.jpg"
      alt="spotBg"
      class="viewPointBg"
      v-show="selectIndex === 3"
    />
    <img
      src="@/assets/images/areaImg/spotBg_island.jpg"
      alt="spotBg"
      class="viewPointBg"
      v-show="selectIndex === 4"
    />

    <div class="relative z-[2]">
      <h2
        class="text-center text-[30px] text-[#188E6B] font-700 relative pb-4 md:hidden"
      >
        熱門景點
      </h2>
      <div class="md:flex md:items-center md:justify-center">
        <div
          class="mx-auto max-w-[250px] pt-5 md:pt-0 md:pl-4 md:mx-none md:max-w-[350px]"
        >
          <img :src="dataImg" alt="" />
        </div>
        <div class="px-4 md:flex-1 md:max-w-[800px] md:pl-0">
          <h2
            class="hidden text-center text-[30px] text-[#188E6B] font-700 relative pb-4 md:block"
          >
            熱門景點
          </h2>
          <div class="flex gap-5 justify-center pb-5 flex-wrap">
            <button
              class="btn btn-secondary"
              :class="{ active: selectIndex === index }"
              v-for="(btn, index) in viewArea"
              :key="btn"
              @click="selectIndex = index"
            >
              {{ btn }}
            </button>
          </div>
          <div class="mx-auto max-w-[600px] leading-6 text-[#fff]">
            <p v-for="text in dataText" :key="text" class="pb-4">
              {{ text }}
            </p>
          </div>

          <!-- 景點卡牌 -->
          <div class="relative mx-auto max-w-[700px]">
            <button
              v-if="idx > 0"
              @click="clickAreaIdx('left')"
              class="shadow024 hidden w-[50px] h-[50px] rounded-full bg-white items-center justify-center absolute -left-5 top-1/2 -translate-y-1/2 z-2 md:flex"
            >
              <img src="@/assets/images/icon/arrow-left.svg" alt="" />
            </button>
            <button
              v-if="idx < maxIdx"
              @click="clickAreaIdx('right')"
              class="shadow024 w-[50px] h-[50px] rounded-full bg-white items-center justify-center absolute -right-3 top-1/2 -translate-y-1/2 z-2 hidden md:flex xl:-right-6"
            >
              <img src="@/assets/images/icon/arrow-right.svg" alt="" />
            </button>
            <div class="viewPointSlider pt-5 flex gap-4 overflow-auto">
              <router-link
                v-for="data in selectAreaData"
                :key="data"
                :to="{
                  path: `viewList/${data.id}`,
                }"
                class="areaImg inline-block border-solid border-[#1Fb588] border-2 rounded-2xl overflow-hidden text-[#fff] relative flex-shrink-0 last:mr-4"
                :style="sliderStyle"
              >
                <img
                  :src="getImagePath(data.photoSrc)"
                  class="w-50 h-50 object-cover"
                  :alt="data.title"
                />
                <div class="absolute bottom-3 left-3 z-2">
                  <h4 class="pb-2">{{ data.city }}</h4>
                  <h4 class="text-[18px] font-700">
                    {{ data.title }}
                  </h4>
                </div>
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.viewPointContainer {
  position: relative;
  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.4);
    z-index: 0;
  }

  .viewPointBg {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    z-index: -1;
    object-fit: cover;
    animation: 2s blurIn cubic-bezier(0.2, 0.98, 0.5, 0.98);
    overflow: hidden;
  }
  .viewPointSlider {
    transition: transform 0.5s;
    &::-webkit-scrollbar {
      display: none;
    }
  }
  .areaImg {
    transition: transform 0.5s;
    position: relative;

    &::after {
      content: "";
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.2);
      z-index: 0;
    }
  }
  @keyframes blurIn {
    0% {
      -webkit-transform: scale3d(1.2, 1.2, 1);
      transform: scale3d(1.2, 1.2, 1);
      -webkit-filter: blur(10px);
      filter: blur(10px);
    }
    100% {
      -webkit-transform: scale3d(1, 1, 1);
      transform: scale3d(1, 1, 1);
      -webkit-filter: blur(0);
      filter: blur(0);
    }
  }
}
@media (min-width: 960px) {
  .viewPointContainer {
    &::after {
      background-color: rgba(0, 0, 0, 0.3);
    }
  }
}
</style>

