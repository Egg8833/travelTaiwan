<script setup>
import satisfaction from "../components/satisfaction.vue";
import favoriteImg from "../assets/images/icon/heart-outline.svg";
import { computed } from "vue";
import { getImagePath } from "@/common/useImage";

const props = defineProps({
  cardData: {
    type: Object,
    // default: [
    //   {
    //     id: Number,
    //     title: String,
    //     photoSrc: String,
    //     favoriteImg: String,
    //     tagText: Array,
    //     description: String,
    //     phone: Number,
    //     openTime: String,
    //   },
    // ],
  },
});
const cardData = computed(() => props.cardData);
</script>

<template>
  <div class="card shadow024 px-6 pt-5 pb-6 rounded-8px lg:flex-shrink-0">
    <div class="relative inline-block mb-2">
      <img
        :src="getImagePath(cardData.photoSrc)"
        class="object-cover w-[274px] h-[168px]"
      />
      <div
        class="absolute top-2 right-2 flex items-center justify-center w-10 h-10 bg-white border-[#28DAA5] rounded-full border-1 border-solid"
      >
        <img :src="favoriteImg" alt="heart" />
      </div>
    </div>
    <h3 class="pb-1 text-[#434343] text-[24px] font-700 truncate">
      {{ cardData.title }}
    </h3>
    <satisfaction :startNum="cardData.startNum"></satisfaction>
    <div class="pt-2 gap-2 flex min-h-[36px]">
      <button v-for="(tag, index) in cardData.tagText" :key="index" class="tag">
        {{ tag }}
      </button>
    </div>
  </div>
</template>

<style>
.card {
  max-width: 300px;
}
.shadow024 {
  box-shadow: 0px 4px 10px 0px #80808033;
}
</style>

