<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { auth } from '@/services/remote/firebase/config'

const route = useRoute()

const navItems = [
  { label: 'Mis viajes', to: '/dashboard', icon: 'mdi-view-dashboard-outline' },
  { label: 'Nuevo viaje', to: '/new-project', icon: 'mdi-plus-circle-outline' },
]

const isLoggedIn = computed(() => !!auth.currentUser)
</script>

<template>
  <v-app-bar app flat class="nav-bar" height="76">
    <div class="nav-shell">
      <RouterLink to="/" class="brand-link" aria-label="Ir al inicio">
        <img src="@/assets/logo/icon.small.png" alt="GroupTrip" class="brand-logo" />
      </RouterLink>

      <nav class="nav-links" aria-label="Navegación principal">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-router-link"
        >
          <v-btn
            :class="['nav-btn', { 'nav-btn-active': route.path === item.to }]"
            :prepend-icon="item.icon"
            variant="text"
          >
            {{ item.label }}
          </v-btn>
        </RouterLink>
      </nav>

      <RouterLink
        :to="isLoggedIn ? '/dashboard' : '/login'"
        class="profile-link"
        :aria-label="isLoggedIn ? 'Ir al panel' : 'Iniciar sesión'"
      >
        <v-avatar size="44" class="profile-avatar">
          <v-icon size="24">mdi-account-outline</v-icon>
        </v-avatar>
      </RouterLink>
    </div>
  </v-app-bar>
</template>

<style scoped>
.nav-bar {
  background: rgba(255, 255, 255, 0.9) !important;
  border-bottom: 1px solid var(--gt-border);
  backdrop-filter: blur(14px);
}

.nav-shell {
  width: min(1180px, calc(100% - 28px));
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.brand-link,
.profile-link,
.nav-router-link {
  color: inherit;
  text-decoration: none;
}

.brand-logo {
  width: 118px;
  height: auto;
  display: block;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: auto;
}

.nav-btn {
  color: var(--gt-muted) !important;
  border-radius: 999px !important;
  font-weight: 750 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
}

.nav-btn-active {
  color: var(--gt-primary-dark) !important;
  background: rgba(15, 118, 110, 0.1) !important;
}

.profile-avatar {
  border: 1px solid rgba(15, 118, 110, 0.22);
  color: var(--gt-primary-dark);
  background: #ecfdf5;
}

@media (max-width: 720px) {
  .nav-shell {
    width: min(100% - 20px, 1180px);
    gap: 0.5rem;
  }

  .brand-logo {
    width: 96px;
  }

  .nav-btn {
    min-width: 42px !important;
    padding-inline: 0.65rem !important;
  }

  .nav-btn :deep(.v-btn__content) {
    display: none;
  }
}
</style>
