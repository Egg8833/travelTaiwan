<script setup>
import {computed, ref} from "vue";
import {useRouter} from "vue-router";
import {useAuthStore} from "@/store/authStore.js";

const authStore = useAuthStore();
const router = useRouter();

const isGoogleUser = computed(
  () => authStore.user?.providerData?.[0]?.providerId === "google.com"
);
const password = ref("");
const confirmText = ref("");
const reauthenticated = ref(false);
const working = ref(false);

const reauth = async () => {
  working.value = true;
  reauthenticated.value = await authStore.reauthenticate(password.value);
  working.value = false;
};

const confirmDelete = async () => {
  if (confirmText.value !== "刪除") {
    alert('請輸入「刪除」以確認');
    return;
  }
  if (!confirm("確定要永久刪除帳號嗎？此操作無法復原。")) return;
  working.value = true;
  const ok = await authStore.deleteAccount();
  working.value = false;
  if (ok) router.push({name: "home"});
};
</script>

<template>
  <div class="pt-6">
    <p class="font-700 text-[#EB5757] mb-2">刪除帳號</p>
    <p class="text-[#808080] mb-3">
      刪除後，你的收藏與評論都會一併永久刪除，且無法復原。
    </p>

    <div v-if="!reauthenticated">
      <input
        v-if="!isGoogleUser"
        v-model="password"
        type="password"
        placeholder="請輸入目前密碼以繼續"
        class="w-full mb-2 rounded-[8px] border-1 border-solid border-[#eee] py-2 px-4"
      />
      <button class="btn-secondary" :disabled="working" @click="reauth">
        {{ isGoogleUser ? "重新以 Google 登入驗證" : "驗證身份" }}
      </button>
    </div>

    <div v-else>
      <input
        v-model="confirmText"
        type="text"
        placeholder='請輸入「刪除」以確認'
        class="w-full mb-2 rounded-[8px] border-1 border-solid border-[#eee] py-2 px-4"
      />
      <button
        class="py-2 px-5 rounded-[62px] border-1 border-solid border-[#EB5757] text-[#EB5757] font-700"
        :disabled="working"
        @click="confirmDelete"
      >
        {{ working ? "刪除中…" : "永久刪除帳號" }}
      </button>
    </div>
  </div>
</template>
