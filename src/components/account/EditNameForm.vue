<script setup>
import {ref} from "vue";
import {useAuthStore} from "@/store/authStore.js";

const authStore = useAuthStore();
const name = ref(authStore.user?.displayName || "");
const saving = ref(false);

const save = async () => {
  if (!name.value.trim()) {
    alert("請輸入名稱");
    return;
  }
  saving.value = true;
  await authStore.updateDisplayName(name.value.trim());
  saving.value = false;
};
</script>

<template>
  <div class="pb-6 border-b border-b-solid border-[#eee]">
    <p class="font-700 text-[#434343] mb-2">顯示名稱</p>
    <div class="flex gap-2">
      <input
        v-model="name"
        type="text"
        class="flex-1 rounded-[8px] border-1 border-solid border-[#eee] py-2 px-4"
      />
      <button class="btn" :disabled="saving" @click="save">
        {{ saving ? "儲存中…" : "儲存" }}
      </button>
    </div>
  </div>
</template>
