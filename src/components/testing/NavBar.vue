<script setup lang="ts">
const navItems = [
  { label: 'Mis Proyectos', to: '/dashboard' },
  { label: 'Nuevo Proyecto', to: '/new-project' },
]
</script>

<template>
  <v-app-bar app flat class="nav-bar px-4" height="92">
    <div class="nav-left">
      <RouterLink to="/" class="logo-link" aria-label="Ir al inicio">
        <img src="@/assets/logo/icon.small.png" alt="Logo" height="60" width="140" contain />
      </RouterLink>

      <div class="nav-links">
        <RouterLink
          v-for="item in navItems"
          :key="item.label"
          :to="item.to"
          class="nav-router-link"
        >
          <v-btn class="nav-btn" rounded="lg" elevation="0">
            {{ item.label }}
          </v-btn>
        </RouterLink>
      </div>
    </div>

    <template #append>
      <RouterLink to="/login" class="profile-link" aria-label="Perfil de usuario">
        <v-avatar size="68" class="profile-avatar">
          <v-icon size="40">mdi-account-outline</v-icon>
        </v-avatar>
      </RouterLink>
    </template>
  </v-app-bar>
</template>

<style scoped>
.nav-bar {
  background-color: white;
  border-top: 2px solid var(--color-Molten-Orange);
  border-left: 2px solid var(--color-Molten-Orange);
  border-right: 2px solid var(--color-Molten-Orange);
  border-bottom: 2px solid var(--color-Molten-Orange);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 20px;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 2rem;
  width: 100%;
}

.logo-link,
.profile-link,
.nav-router-link {
  text-decoration: none;
  color: inherit;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.nav-btn {
  background-color: var(--color-Oxblood);
  color: white;
  font-weight: 700;
  text-transform: none;
  letter-spacing: 0;
  padding-inline: 1.1rem;
}

.profile-avatar {
  border: 3px solid var(--color-Oxblood);
  color: var(--color-Oxblood);
  background-color: white;
}

@media (max-width: 760px) {
  .nav-left {
    gap: 1rem;
  }

  .nav-links {
    gap: 0.5rem;
  }

  .nav-btn {
    font-size: 0.85rem;
    padding-inline: 0.8rem;
  }
}
</style>
