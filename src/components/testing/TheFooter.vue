<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '@/services/remote/firebase/config'

const currentUser = ref<User | null>(auth.currentUser)
let unsubscribe: (() => void) | undefined

onMounted(() => {
  unsubscribe = onAuthStateChanged(auth, (user) => {
    currentUser.value = user
  })
})

onUnmounted(() => {
  unsubscribe?.()
})
</script>

<template>
  <v-footer class="footer-root">
    <section v-if="!currentUser" class="footer-cta">
      <div class="footer-shell footer-cta-inner">
        <div>
          <p class="gt-kicker mb-2">GroupTrip</p>
          <h2 class="footer-title">¿Listo para tu próxima aventura?</h2>
          <p class="footer-text">
            Organiza viajes en grupo, comparte planes y mantén a todos alineados desde un solo lugar.
          </p>
        </div>

        <v-btn to="/register" class="gt-primary-btn" size="large" prepend-icon="mdi-rocket-launch-outline">
          Comienza gratis
        </v-btn>
      </div>
    </section>

    <section class="footer-main">
      <div class="footer-shell footer-grid">
        <div class="footer-brand">
          <v-img src="@/assets/logo/icon.small.png" alt="GroupTrip" width="145" />
          <p>
            Plataforma para organizar viajes colaborativos, itinerarios y actividades con grupos pequeños.
          </p>
        </div>

        <div class="footer-column">
          <h3>Producto</h3>
          <RouterLink to="/">Inicio</RouterLink>
          <RouterLink to="/dashboard">Mis viajes</RouterLink>
          <RouterLink to="/new-project">Crear viaje</RouterLink>
        </div>

        <div class="footer-column">
          <h3>Soporte</h3>
          <a href="mailto:soporte@grouptrip.app">soporte@grouptrip.app</a>
          <a href="mailto:privacidad@grouptrip.app">privacidad@grouptrip.app</a>
          <span>Lun-Vie, 9:00-18:00 CET</span>
        </div>

        <div class="footer-column">
          <h3>Información</h3>
          <span>Proyecto académico PDIGS</span>
          <span>Canarias, España</span>
          <span>Versión beta 2026</span>
        </div>
      </div>
    </section>

    <section class="footer-bottom">
      <div class="footer-shell footer-bottom-inner">
        <span>© 2026 GroupTrip. Todos los derechos reservados.</span>
        <span>Hecho para viajar en grupo con menos fricción.</span>
      </div>
    </section>
  </v-footer>
</template>

<style scoped>
.footer-root {
  display: block;
  width: 100%;
  padding: 0 !important;
}

.footer-shell {
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
}

.footer-cta {
  background:
    linear-gradient(135deg, rgba(250, 204, 21, 0.24), rgba(249, 115, 22, 0.14)),
    #fff8eb;
  border-top: 1px solid var(--gt-border);
}

.footer-cta-inner {
  padding: 3.2rem 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
}

.footer-title {
  max-width: 560px;
  color: var(--gt-text);
  font-size: clamp(2rem, 4vw, 3.1rem);
  font-weight: 850;
  line-height: 1.05;
}

.footer-text {
  max-width: 620px;
  margin-top: 0.85rem;
  color: var(--gt-muted);
  font-size: 1.05rem;
}

.footer-main {
  background: #431407;
  color: rgba(255, 255, 255, 0.82);
}

.footer-grid {
  padding: 3rem 0;
  display: grid;
  grid-template-columns: minmax(220px, 1.35fr) repeat(3, minmax(160px, 1fr));
  gap: 2rem;
}

.footer-brand p {
  max-width: 320px;
  margin-top: 1rem;
  color: rgba(255, 255, 255, 0.72);
}

.footer-column {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.footer-column h3 {
  margin-bottom: 0.35rem;
  color: #facc15;
  font-size: 0.9rem;
  font-weight: 850;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.footer-column a,
.footer-column span {
  color: rgba(255, 255, 255, 0.74);
  text-decoration: none;
}

.footer-column a:hover {
  color: #facc15;
}

.footer-bottom {
  background: #2f0f05;
  color: rgba(255, 255, 255, 0.68);
}

.footer-bottom-inner {
  padding: 1rem 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.9rem;
}

@media (max-width: 840px) {
  .footer-cta-inner,
  .footer-bottom-inner {
    align-items: flex-start;
    flex-direction: column;
  }

  .footer-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 560px) {
  .footer-grid {
    grid-template-columns: 1fr;
  }
}
</style>
