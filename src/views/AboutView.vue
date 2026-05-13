<script setup lang="ts">
import NavBar from '@/components/testing/NavBar.vue'
import TheFooter from '@/components/testing/TheFooter.vue'

const features = [
  { title: 'Planificación clara', icon: 'mdi-map-marker-path', desc: 'Itinerarios, mapas y actividades visibles para todo el grupo.' },
  { title: 'Colaboración simple', icon: 'mdi-account-group-outline', desc: 'Comparte viajes y suma personas sin perder el contexto.' },
  { title: 'Presupuesto a la vista', icon: 'mdi-wallet-outline', desc: 'Costes y actividades ordenadas para decidir mejor.' },
  { title: 'Ayuda con IA', icon: 'mdi-auto-fix', desc: 'Genera ideas iniciales cuando todavía estás aterrizando el viaje.' },
]
</script>

<template>
  <v-app>
    <NavBar />

    <v-main class="gt-page">
      <section class="hero">
        <div class="gt-container hero-grid">
          <div class="hero-copy">
            <p class="gt-kicker">Planifica mejor en grupo</p>
            <h1 class="hero-title gt-title">
              Viajes compartidos, decisiones más fáciles.
            </h1>
            <p class="hero-subtitle">
              GroupTrip reúne destino, fechas, actividades, mapa y miembros en una experiencia pensada para organizar aventuras sin conversaciones dispersas.
            </p>

            <div class="hero-actions">
              <v-btn to="/register" class="gt-primary-btn" size="x-large" prepend-icon="mdi-rocket-launch-outline">
                Comienza gratis
              </v-btn>
              <v-btn to="/login" class="gt-secondary-btn" size="x-large" variant="outlined" color="red-darken-3">
                Ya tengo cuenta
              </v-btn>
            </div>
          </div>

          <div class="hero-media">
            <v-img
              alt="Personas organizando un viaje juntas"
              src="https://images.unsplash.com/photo-1527631746610-bca00a040d60?q=80&w=1200&auto=format&fit=crop"
              cover
              class="hero-img"
            />
            <div class="trip-summary gt-card">
              <v-icon icon="mdi-calendar-check-outline" color="red-darken-3" />
              <div>
                <strong>Ruta lista</strong>
                <span>4 días, 8 actividades</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="features">
        <div class="gt-container">
          <div class="section-heading">
            <p class="gt-kicker">Lo esencial</p>
            <h2 class="gt-title">Todo el viaje en una sola vista</h2>
          </div>

          <v-row>
            <v-col v-for="feature in features" :key="feature.title" cols="12" sm="6" lg="3">
              <v-card class="gt-card feature-card" elevation="0">
                <v-icon :icon="feature.icon" size="34" color="red-darken-3" />
                <h3>{{ feature.title }}</h3>
                <p>{{ feature.desc }}</p>
              </v-card>
            </v-col>
          </v-row>
        </div>
      </section>

      <section class="story">
        <div class="gt-container story-grid">
          <v-img
            alt="Amigos revisando planes de viaje"
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop"
            cover
            class="story-img"
          />

          <div>
            <p class="gt-kicker">De idea a itinerario</p>
            <h2 class="gt-title">Menos coordinación manual, más viaje.</h2>
            <p class="story-copy">
              Crea el proyecto, invita al grupo, añade actividades y revisa la ruta en mapa o calendario. La interfaz prioriza lo que toca decidir ahora.
            </p>
            <v-btn to="/new-project" class="gt-primary-btn mt-6" size="large" prepend-icon="mdi-plus">
              Crear un viaje
            </v-btn>
          </div>
        </div>
      </section>
    </v-main>

    <TheFooter />
  </v-app>
</template>

<style scoped>
.hero {
  padding: clamp(3rem, 7vw, 6.5rem) 0 4rem;
}

.hero-grid,
.story-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.92fr);
  align-items: center;
  gap: clamp(2rem, 5vw, 4.5rem);
}

.hero-title {
  max-width: 690px;
  font-size: clamp(3rem, 7vw, 5.7rem);
}

.hero-subtitle,
.story-copy {
  max-width: 640px;
  margin-top: 1.25rem;
  color: var(--gt-muted);
  font-size: 1.15rem;
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  margin-top: 2rem;
}

.hero-media {
  position: relative;
}

.hero-img,
.story-img {
  min-height: 480px;
  border-radius: 28px;
  box-shadow: var(--gt-shadow-md);
}

.trip-summary {
  position: absolute;
  left: -22px;
  bottom: 24px;
  padding: 1rem 1.15rem;
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.trip-summary div {
  display: flex;
  flex-direction: column;
}

.trip-summary span {
  color: var(--gt-muted);
  font-size: 0.9rem;
}

.features,
.story {
  padding: 4.5rem 0;
}

.section-heading {
  max-width: 640px;
  margin-bottom: 1.5rem;
}

.section-heading h2,
.story h2 {
  font-size: clamp(2rem, 4vw, 3.2rem);
}

.feature-card {
  min-height: 220px;
  padding: 1.45rem;
}

.feature-card h3 {
  margin-top: 1rem;
  color: var(--gt-text);
  font-weight: 800;
}

.feature-card p {
  margin-top: 0.5rem;
  color: var(--gt-muted);
  line-height: 1.55;
}

@media (max-width: 900px) {
  .hero-grid,
  .story-grid {
    grid-template-columns: 1fr;
  }

  .hero-img,
  .story-img {
    min-height: 340px;
  }

  .trip-summary {
    left: 16px;
  }
}
</style>
