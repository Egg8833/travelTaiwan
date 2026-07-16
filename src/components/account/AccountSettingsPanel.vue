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
  <div class="mb-8">
    <h2 class="text-[20px] font-700 text-[#434343] mb-4">帳號設定</h2>
    <EditNameForm />
    <AvatarUploader />
    <template v-if="isPasswordUser">
      <ChangePasswordForm />
      <ChangeEmailForm />
    </template>
    <DeleteAccountForm />
  </div>
</template>
