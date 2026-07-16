<script setup>
import {ref} from "vue";
import {useAuthStore} from "@/store/authStore.js";

const authStore = useAuthStore();
const uploading = ref(false);
const fileInput = ref(null);

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024;

const pickFile = () => fileInput.value?.click();

const onFileChange = async e => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  if (!ALLOWED_TYPES.includes(file.type)) {
    alert("請上傳 jpg、png 或 webp 格式的圖片");
    return;
  }
  if (file.size > MAX_SIZE) {
    alert("圖片大小請勿超過 2MB");
    return;
  }
  uploading.value = true;
  await authStore.uploadAvatar(file);
  uploading.value = false;
};
</script>

<template>
  <div class="pt-6 pb-6 border-b border-b-solid border-[#eee]">
    <p class="font-700 text-[#434343] mb-2">大頭貼</p>
    <div class="flex items-center gap-4">
      <img
        v-if="authStore.user?.photoURL"
        :src="authStore.user.photoURL"
        class="w-14 h-14 rounded-full object-cover"
        alt="avatar"
      />
      <div v-else class="w-14 h-14 rounded-full bg-[#1FB588]"></div>
      <button class="btn-secondary" :disabled="uploading" @click="pickFile">
        {{ uploading ? "上傳中…" : "更換大頭貼" }}
      </button>
      <input
        ref="fileInput"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        class="hidden"
        @change="onFileChange"
      />
    </div>
  </div>
</template>
