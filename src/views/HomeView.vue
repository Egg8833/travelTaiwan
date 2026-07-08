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

const data1 = [
  {
    city: "新北市",
    id: "VCA_379000000A_000283",
    title: "烏來瀑布",
    phone: "886-2-26616942",
    openTime: "纜車資訊：上午8：30開始每隔10~15分鐘對開一班下午22：00最末班車",
    tagText: ["自然風景類", "遊憩類", "其他"],
    startNum: 5,
    photoSrc: ["https://www.travel.taipei/image/363147"],
    description:
      "烏來瀑布是北台灣落差最大的瀑布，在日治時期被列為台灣八景之一，更有「雲來之瀧」的美名。雨量豐沛時，烏來瀑布會形成兩道飛泉，從山谷中飛流直下，展現氣勢磅礡之美；春季更可以欣賞瀑布旁綻放的朵朵粉嫩櫻花，點綴瀑布山林。▲圖片來源：新北市觀光旅遊網搭乘台車、纜車，玩翻烏來來到烏來，一定要搭乘目前全台僅存台車鐵道—烏來台車！烏來台車是早期運送木材的鐵路台車，於1963年改為觀光用途，旅客可透過開放式車窗門板吸收山林芬多精、飽覽山巒風光，而烏來瀑布就位於台車終點站，可近距離觀賞烏來瀑布，享受被群山與瀑布包圍的悠閒氣氛。▲圖片來源：新北市觀光旅遊網抵達台車瀑布站之後，可以轉搭烏來纜車，隨著纜車緩緩而上，從空中俯瞰烏來、一覽瀑布全貌，纜車終點在雲仙樂園，旅客可在此休憩停留一晚，參加夜間賞蛙導覽、划船賞湖景等多樣活動。烏來老街也別忘了品嚐烏來老街上的炸溪魚、竹筒飯等原住民風味小食，烏來原住民多以泰雅族為主，而「烏來」在泰雅族語裡是「溫泉」的意思。在烏來可以漫遊烏來老街、認識泰雅族文化、泡溫泉暖暖身，也可以搭乘台車觀賞瀑布美景，來趟清幽烏來兩天一夜之旅。(資料來源：新北市觀光旅遊網)",
    ZipCode: "233",
  },
  {
    city: "新北市",
    id: "VCA_379000000A_000423",
    title: "無極天元宮",
    phone: "886-2-26212759、886-2-26219159",
    tagText: ["自然風景類"],
    startNum: 4,
    photoSrc: ["https://www.travel.taipei/image/91886"],
    description:
      "「淡水天元宮」位於大屯山脈西北邊，距離淡水市區、淡水捷運站約5公里路程，在西元1985年落成，正殿供奉無極老祖，主神為玉皇大帝；1992年增建「無極天元真壇」，高為200公尺，樓高五層樓、圓形的建築外觀直徑高達108公尺，非常雄偉及壯觀，每個殿供奉無極界的諸位先佛，櫻花季時雄偉的天壇與櫻花相互映襯，非常值得一訪。淡水天元宮有分後山與天壇周圍，兩區為不同品種，盛開與賞櫻時間也不大一樣，後山有三色櫻有粉色、白色、桃紅三色層次豐富，會較早盛開，重頭戲的天壇周圍為吉野櫻，較後山約慢一個月盛開，在此時賞櫻的遊客將會達到高峰！夜間天壇也會點上燈，在夜間賞櫻別有一番風味。來天元宮賞櫻花拍照一定要拍到櫻花搭配天壇的整體畫面，建議在後山這片櫻花林最合適。為求順光，拍照最佳時間點在早上，櫻花的色調在陽光照射下會是最美的時刻。每到春日盛開時節爭奇鬥豔，成為賞櫻勝地。以臺灣原生種山櫻花接上日本吉野櫻的植種方式，使得此處櫻花呈現淡粉色的優美花景，點點緋櫻伴隨春天氣息，在每年每年到1-4月櫻花綻放時節，便可見滿山遍野的台灣山櫻花與日本吉野櫻相互輝映，熱情綻放！都吸引大量想一親芳澤的遊客前來。(資料來源：新北市觀光旅遊網)",
    ZipCode: "251",
  },
  {
    city: "臺南市",
    id: "VCA_397000000A_000235",
    title: "內門308高地",
    phone: "886-7-7995678",
    openTime: "全天候開放",
    tagText: ["自然風景類"],
    startNum: 4,
    photoSrc: [
      "https://khh.travel/content/images/Attractions/43417/640x480_attractions-image-bv1bnqrdski7z2xrvkhncw.jpg",
    ],
    description:
      "內門308高地位處高雄內門與台南左鎮的交界稜線上，因海拔308公尺得名，當地人又稱作「望高寮」，是周遭山巒的至高點、欣賞惡地地形的最佳位置，南台灣的惡地地形分布於高雄與台南的淺山地帶，屬於寸草不生的泥岩區，鋸齒狀的裸露陡峭山脊，彷彿來到月球表面，故有「月世界」的響亮俗稱。308高地除了著名的景觀餐廳外，也設有雙層觀景平台，環顧四週，宛如自己就在月球上漫步著，天氣晴朗時，更能遠眺嘉南平原、臺灣海峽，風光綺麗、變化萬千。傍晚時分，夕陽西陲的美景，令人流連忘返。",
    ZipCode: "845",
    Address: "高雄市845內門區",
  },
];

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
    <HotCheckInPoint :data="data1"></HotCheckInPoint>

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

