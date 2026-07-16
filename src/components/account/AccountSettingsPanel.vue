<script setup>
import {computed} from "vue";
import {useAuthStore} from "@/store/authStore.js";
import EditNameForm from "./EditNameForm.vue";
import AvatarUploader from "./AvatarUploader.vue";
import ChangePasswordForm from "./ChangePasswordForm.vue";
import ChangeEmailForm from "./ChangeEmailForm.vue";
import DeleteAccountForm from "./DeleteAccountForm.vue";

const authStore = useAuthStore();
const isPasswordUser = computed(
  () => authStore.user?.providerData?.[0]?.providerId === "password"
);
</script>

<template>
  <div class="mb-10">
    <h2 class="text-[20px] font-700 text-[#434343] mb-4 flex items-center gap-2">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="shrink-0">
        <circle cx="12" cy="8" r="3.2" fill="#1FB588" />
        <path d="M5 20c0-3.9 3.1-6 7-6s7 2.1 7 6" stroke="#1FB588" stroke-width="1.8" stroke-linecap="round" />
      </svg>
      帳號設定
    </h2>

    <div class="flex flex-col gap-4">
      <div class="settings-card shadow024 rounded-[16px] bg-white border border-solid border-[#eee] px-6 pt-6 pb-2">
        <p class="settings-card-title">個人資料</p>
        <EditNameForm />
        <AvatarUploader last />
      </div>

      <div
        v-if="isPasswordUser"
        class="settings-card shadow024 rounded-[16px] bg-white border border-solid border-[#eee] px-6 pt-6 pb-2"
      >
        <p class="settings-card-title">帳號安全</p>
        <ChangePasswordForm />
        <ChangeEmailForm last />
      </div>

      <div
        class="settings-card--danger rounded-[16px] bg-[#FFF7F7] border border-solid border-[#F5C6C6] px-6 py-6"
      >
        <DeleteAccountForm />
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-card-title {
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.08em;
  color: #1fb588;
  text-transform: uppercase;
  margin-bottom: 0.75rem;
}
</style>
