<script setup>
import {ref} from "vue";
import {useAuthStore} from "@/store/authStore.js";

const authStore = useAuthStore();
const currentPassword = ref("");
const newPassword = ref("");
const saving = ref(false);

const save = async () => {
  if (newPassword.value.length < 6) {
    alert("新密碼至少需要 6 個字元");
    return;
  }
  saving.value = true;
  const ok = await authStore.changePassword(currentPassword.value, newPassword.value);
  saving.value = false;
  if (ok) {
    currentPassword.value = "";
    newPassword.value = "";
    alert("密碼已更新");
  }
};
</script>

<template>
  <div class="pt-6 pb-6 border-b border-b-solid border-[#eee]">
    <p class="font-700 text-[#434343] mb-2">修改密碼</p>
    <input
      v-model="currentPassword"
      type="password"
      placeholder="目前密碼"
      class="w-full mb-2 rounded-[8px] border-1 border-solid border-[#eee] py-2 px-4"
    />
    <input
      v-model="newPassword"
      type="password"
      placeholder="新密碼（至少 6 個字元）"
      class="w-full mb-2 rounded-[8px] border-1 border-solid border-[#eee] py-2 px-4"
    />
    <button class="btn" :disabled="saving" @click="save">
      {{ saving ? "更新中…" : "更新密碼" }}
    </button>
  </div>
</template>
