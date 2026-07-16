<script setup>
import {ref} from "vue";
import {useAuthStore} from "@/store/authStore.js";

defineProps({
  last: {type: Boolean, default: false},
});
const authStore = useAuthStore();
const currentPassword = ref("");
const newEmail = ref("");
const saving = ref(false);
const sent = ref(false);

const save = async () => {
  if (!newEmail.value.includes("@")) {
    alert("請輸入正確的 Email 格式");
    return;
  }
  saving.value = true;
  const ok = await authStore.changeEmail(currentPassword.value, newEmail.value);
  saving.value = false;
  if (ok) {
    currentPassword.value = "";
    sent.value = true;
  }
};
</script>

<template>
  <div :class="['pt-6 pb-6', !last && 'border-b border-b-solid border-[#eee]']">
    <p class="font-700 text-[#434343] mb-2">修改 Email</p>
    <p v-if="sent" class="text-[#1FB588] mb-2">
      驗證信已寄到新信箱，請點擊信中連結完成變更（完成前畫面上仍會顯示舊 Email）。
    </p>
    <input
      v-model="currentPassword"
      type="password"
      placeholder="目前密碼"
      class="w-full mb-2 rounded-[8px] border-1 border-solid border-[#eee] py-2 px-4"
    />
    <input
      v-model="newEmail"
      type="email"
      placeholder="新 Email"
      class="w-full mb-2 rounded-[8px] border-1 border-solid border-[#eee] py-2 px-4"
    />
    <button class="btn" :disabled="saving" @click="save">
      {{ saving ? "送出中…" : "送出驗證信" }}
    </button>
  </div>
</template>
