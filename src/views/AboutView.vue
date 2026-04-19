<script setup lang="ts">
import NavBar from '@/components/testing/NavBar.vue'
import TheFooter from '@/components/testing/TheFooter.vue'

const features = [
  { color: '#D1C4E9', title: 'Planificación', icon: 'mdi-map-marker-path', desc: 'Rutas inteligentes' },
  { color: '#FFCDD2', title: 'Colaboración', icon: 'mdi-account-group', desc: 'Edición en vivo' },
  { color: '#C8E6C9', title: 'Presupuesto', icon: 'mdi-wallet', desc: 'Gastos divididos' },
  { color: '#B3E5FC', title: 'Seguridad', icon: 'mdi-shield-check', desc: 'Datos cifrados' },
]
</script>

<template>
  <v-app>
    <NavBar />

    <v-main class="main-content">
      <section class="hero-section">
        <v-container class="top-container">
          <v-row align="center" class="min-vh-70">
            <v-col cols="12" md="6" class="left-top-container pa-8">
              <v-chip color="black" theme="dark" class="mb-4 font-weight-bold px-4" label>
                ✨ NUEVA ERA DE VIAJES
              </v-chip>
              <h1 class="display-title mb-6">
                Viaja en grupo <span class="text-highlight">sin dramas.</span>
              </h1>
              <p class="hero-subtitle mb-10">
                La herramienta definitiva para amigos que quieren explorar el mundo.
                Sincroniza planes, divide cuentas y crea recuerdos, todo en tiempo real.
              </p>

              <div class="d-flex gap-6 flex-wrap">
                <v-btn
                  color="var(--color-orange)"
                  size="x-large"
                  class="brutalist-btn font-weight-black"
                  to="/register"
                  elevation="0"
                >
                  Comienza gratis
                  <v-icon end>mdi-arrow-right</v-icon>
                </v-btn>
              </div>

            </v-col>

            <v-col cols="12" md="6" class="d-flex justify-center relative">
              <div class="hero-image-container">
                <div class="image-backdrop"></div>
                <v-img
                  src="https://images.unsplash.com/photo-1527631746610-bca00a040d60?q=80&w=800"
                  cover
                  class="hero-img border-black shadow-brutal"
                />
              </div>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <section class="features-section py-16">
        <v-container>
          <div class="text-center mb-16">
            <h2 class="section-title text-uppercase mb-4">Todo lo que necesitas</h2>
          </div>

          <v-row>
            <v-col
              v-for="(feat, i) in features"
              :key="i"
              cols="12"
              sm="6"
              md="3"
              class="feature-col"
              :style="{ '--delay': `${i * 90}ms` }"
            >
              <v-card
                :color="feat.color"
                class="feature-card border-black shadow-brutal pa-6"
                flat
              >
                <div class="icon-circle border-black mb-4">
                  <v-icon :icon="feat.icon" size="32" color="black" />
                </div>
                <h3 class="text-h6 font-weight-black mb-2">{{ feat.title }}</h3>
                <p class="text-body-2 mb-0">{{ feat.desc }}</p>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <section class="collab-section py-16">
        <v-container class="mid-container">
          <v-row align="center">
            <v-col cols="12" md="6">
              <v-card class="border-black shadow-brutal overflow-hidden">
                <v-img
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800"
                  height="400"
                  cover
                />
              </v-card>
            </v-col>
            <v-col cols="12" md="6" class="pa-10">
              <h2 class="display-title-small mb-6">Colabora <br>sin límites.</h2>
              <p class="collab-subtitle mb-8">
                Asigna tareas, comparte ideas y mantiene a todo el grupo alineado con una vista clara del viaje.
              </p>
              <v-list bg-color="transparent" class="checklist-panel">
                <v-list-item v-for="(item, i) in ['Sincronización total', 'Chat integrado', 'Permisos granulares', 'Exportación 1-click']" :key="i" class="pa-0 mb-4">
                  <template v-slot:prepend>
                    <v-avatar color="var(--color-orange)" size="32" class="border-black mr-4">
                      <v-icon size="18" color="black">mdi-check</v-icon>
                    </v-avatar>
                  </template>
                  <span class="text-h6 font-weight-bold">{{ item }}</span>
                </v-list-item>
              </v-list>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <section class="cta-banner py-16 text-center">
        <v-container>
          <v-card color="black" theme="dark" class="pa-12 border-orange shadow-orange-brutal cta-card" rounded="xl">
            <h2 class="text-h3 font-weight-black mb-6">¿Listo para despegar?</h2>
            <p class="text-h6 mb-10 text-grey-lighten-1">Únete a más de 50,000 viajeros planificando ahora.</p>
            <v-btn
              color="var(--color-orange)"
              size="x-large"
              class="brutalist-btn font-weight-black"
              to="/register"
              elevation="0"
            >
              CREAR MI PRIMER VIAJE
              <v-icon end>mdi-arrow-right</v-icon>
            </v-btn>
          </v-card>
        </v-container>
      </section>
    </v-main>

    <TheFooter />
  </v-app>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Sora:wght@700;800&display=swap');

.top-container {
  max-width: 1200px;
  margin: 0 auto;
}
/* VARIABLES LOCALES & RESET */
.main-content {
  background:
    radial-gradient(circle at 90% 5%, rgba(255, 187, 106, 0.22) 0%, rgba(255, 187, 106, 0) 38%),
    radial-gradient(circle at 8% 35%, rgba(88, 186, 255, 0.14) 0%, rgba(88, 186, 255, 0) 32%),
    #fdfcf9;
  font-family: 'Manrope', sans-serif;
}

.display-title {
  margin-bottom: 2.5rem;
}
/* HERO */
.hero-section {
  background:
    linear-gradient(130deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.12)),
    radial-gradient(circle at top right, #fff6d6 0%, #fdfcf9 70%);
  border-bottom: 2px solid #000;
}

.min-vh-70 { min-height: 65vh; }

.text-highlight {
  color: var(--color-orange);
  text-decoration: underline;
  text-decoration-style: wavy;
  text-underline-offset: 8px;
}

.hero-subtitle {
  font-size: 1.25rem;
  line-height: 1.6;
  max-width: 500px;
  margin-bottom: 1.5rem;
  color: #2f2f2f;
}

.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.stat-item {
  min-width: 150px;
  display: flex;
  flex-direction: column;
  padding: 0.8rem 1rem;
  border: 2px solid #000;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(1px);
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 800;
  line-height: 1.2;
}

.stat-label {
  font-size: 0.8rem;
  letter-spacing: 0.2px;
  color: #444;
}

/* IMÁGENES & CONTENEDORES */
.hero-image-container {
  position: relative;
  width: 100%;
  max-width: 500px;
}

.image-backdrop {
  position: absolute;
  inset: -16px -12px auto auto;
  width: 180px;
  height: 180px;
  border-radius: 30px;
  background: linear-gradient(145deg, #ffbf66, #ff8e3a);
  border: 3px solid #000;
  transform: rotate(8deg);
  z-index: 0;
}

.hero-img {
  border-radius: 24px;
  height: 450px;
  position: relative;
  z-index: 1;
}

.floating-card {
  position: absolute;
  bottom: 20px;
  left: -30px;
  background: white;
  padding: 12px 24px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 900;
  box-shadow: 8px 8px 0px #000;
  z-index: 2;
}

.features-section {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.mid-container {
  max-width: 1100px;
  margin: 0 auto;
  color: #000;
}

.cta-banner {
  display: flex;
  justify-content: center;
}

/* BOTONES BRUTALISTAS */
.brutalist-btn {
  border: 3px solid #000 !important;
  border-radius: 12px !important;
  box-shadow: 4px 4px 0px #000;
  transition: all 0.1s ease;
  text-transform: uppercase;
}

.brutalist-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 0px 0px 0px #000;
}

.brutalist-btn-outline {
  border: 3px solid #000 !important;
  border-radius: 12px !important;
  background: rgba(255, 255, 255, 0.7);
  transition: all 0.1s ease;
  text-transform: uppercase;
}

.brutalist-btn-outline:hover {
  background: #000;
  color: #fff !important;
}

/* FEATURE CARDS */
.feature-card {
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  border-radius: 20px !important;
  animation: cardEnter 0.55s ease both;
  animation-delay: var(--delay);
}

.feature-card:hover {
  transform: translateY(-6px) rotate(-1.5deg);
  box-shadow: 12px 12px 0px #000;
}

.feature-col:nth-child(even) .feature-card:hover {
  transform: translateY(-6px) rotate(1.5deg);
}

.icon-circle {
  background: white;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* BORDES & SOMBRAS */
.border-black { border: 3px solid #000 !important; }
.border-orange { border: 3px solid var(--color-orange) !important; }

.shadow-brutal { box-shadow: 8px 8px 0px #000; }
.shadow-orange-brutal { box-shadow: 12px 12px 0px var(--color-orange); }

.collab-section {
  background:
    linear-gradient(0deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.4)),
    repeating-linear-gradient(135deg, rgba(0, 0, 0, 0.03) 0 10px, transparent 10px 20px);
}

.collab-subtitle {
  max-width: 520px;
  color: #3c3c3c;
  font-size: 1.05rem;
}

.checklist-panel {
  border: 2px solid #000;
  border-radius: 16px;
  padding: 1rem 1rem 0.4rem;
  background: rgba(255, 255, 255, 0.82);
}

.cta-card {
  position: relative;
  overflow: hidden;
}

.cta-card::before {
  content: '';
  position: absolute;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 181, 70, 0.5), rgba(255, 181, 70, 0));
  top: -80px;
  right: -60px;
  pointer-events: none;
}

/* TIPOGRAFÍA */
.display-title {
  font-size: clamp(3rem, 6vw, 4.5rem);
  font-family: 'Sora', sans-serif;
  font-weight: 800;
  line-height: 1;
  color: #000;
}

.display-title-small {
  font-size: clamp(2.5rem, 5vw, 3.5rem);
  font-family: 'Sora', sans-serif;
  font-weight: 800;
  line-height: 1.1;
}

.section-title {
  font-size: 1.8rem;
  font-weight: 900;
  color: #000;
}

.divider-center {
  width: 80px;
  height: 8px;
  background: var(--color-orange);
  margin: 0 auto;
  border: 2px solid #000;
}

.v-btn {
  padding: 1rem;
}

/* GAP */
.gap-6 { gap: 1.5rem; }

@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 600px) {
  .floating-card { display: none; }
  .display-title { font-size: 3rem; }
  .stats-row {
    flex-direction: column;
  }
  .stat-item {
    width: 100%;
  }
  .checklist-panel {
    padding: 0.85rem 0.85rem 0.2rem;
  }
}
</style>
