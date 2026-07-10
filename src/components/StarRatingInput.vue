<script setup>
import starFilled from "../assets/images/icon/star-filled.svg";
import starOutline from "../assets/images/icon/star-outline.svg";

const props = defineProps({
  modelValue: {type: Number, default: 0},
});
const emit = defineEmits(["update:modelValue"]);
</script>

<template>
  <div class="flex gap-1">
    <button
      v-for="n in 5"
      :key="n"
      type="button"
      @click="emit('update:modelValue', n)"
    >
      <img :src="n <= modelValue ? starFilled : starOutline" alt="star" class="w-6 h-6" />
    </button>
  </div>
</template>
