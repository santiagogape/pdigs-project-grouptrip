<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authService } from '@/services/remote/firebase/authService';
import { projectService } from '@/services/remote/firebase/projectService';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const errorMessage = ref('');

onMounted(async () => {
  const token = route.params.token as string;

  if (!token) {
    router.replace('/dashboard');
    return;
  }

  const user = await authService.waitForAuthReady();

  if (!user) {
    router.replace({
      path: '/login',
      query: { redirect: route.fullPath },
    });
    return;
  }

  try {
    await projectService.addUserToProject(token, user.uid);
    router.replace(`/proyecto/${token}`);
  } catch (error) {
    console.error('Error anadiendo usuario al proyecto:', error);
    errorMessage.value = 'No se pudo unir al proyecto. Comprueba que el enlace sea correcto.';
    loading.value = false;
  }
});
</script>

<template>
  <v-app>
    <v-main class="gt-page share-page">
      <v-container class="share-wrap">
        <v-card class="gt-card share-card" elevation="0">
          <v-progress-circular
            v-if="loading"
            indeterminate
            color="red-darken-3"
            size="48"
          />
          <v-icon
            v-else
            icon="mdi-alert-circle-outline"
            size="54"
            color="red-darken-3"
          />

          <h1>{{ loading ? 'Uniendote al proyecto...' : 'No hemos podido unirte' }}</h1>
          <p>{{ errorMessage || 'Estamos preparando tu acceso al viaje compartido.' }}</p>

          <v-btn
            v-if="!loading"
            to="/dashboard"
            class="gt-primary-btn"
            size="large"
          >
            Volver a mis viajes
          </v-btn>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.share-page {
  min-height: 100vh;
}

.share-wrap {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding-block: 3rem;
}

.share-card {
  width: min(100%, 460px);
  display: grid;
  justify-items: center;
  gap: 1rem;
  padding: clamp(1.5rem, 4vw, 2.4rem);
  text-align: center;
}

.share-card h1 {
  color: var(--gt-text);
  font-size: clamp(1.8rem, 5vw, 2.5rem);
  font-weight: 850;
}

.share-card p {
  color: var(--gt-muted);
}
</style>
