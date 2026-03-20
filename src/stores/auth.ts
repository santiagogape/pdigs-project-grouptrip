// src/stores/auth.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { authService } from '@/services/remote/firebase/authService';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<any>(null);
  const isLoggedIn = ref(false);

  // Inicializar el escuchador
  const currentUser = authService.getCurrentUser();
  if (currentUser) {
    user.value = currentUser;
    isLoggedIn.value = true;
  } else {
    user.value = null;
    isLoggedIn.value = false;
  }

  return { user, isLoggedIn };
});
