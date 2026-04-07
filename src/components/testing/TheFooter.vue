<script setup lang="ts">
const topSurfaces = [
  { id: 1, src: '/src/assets/icons/icons8-calendar-100.png', alt: 'calendar' },
  { id: 2, src: '/src/assets/icons/icons8-grupos-de-usuarios-100.png', alt: 'grupos de usuario' },
  { id: 3, src: '/src/assets/icons/icons8-place-marker-100.png', alt: 'marcador de sitio' },
]
</script>

<template>
  <v-footer class="footer-root">
    <section class="footer-top">
      <div class="footer-top-inner">
        <v-sheet
          v-for="item in topSurfaces"
          :key="item.id"
          class="image-surface"
        >
          <img
            :src="item.src"
            :alt="item.alt"
            class="footer-icon"
          />
        </v-sheet>
      </div>
    </section>

    <section class="footer-cta">
      <div class="footer-cta-inner">
        <h2 class="cta-title">Listo para tu próxima aventura?</h2>
        <p class="cta-text">Organiza viajes en grupo, comparte gastos y crea recuerdos inolvidables con quienes más quieres.</p>

        <RouterLink to="#" class="cta-link">
          <v-btn class="cta-btn text-white" rounded="lg" elevation="0" size="x-large">
            Comienza ahora
            <v-icon end>mdi-arrow-right</v-icon>
          </v-btn>
        </RouterLink>
      </div>
    </section>

    <section class="footer-bottom">
      <div class="footer-bottom-inner">
        <v-img src="@/assets/logo/icon.small.png" alt="Logo" width="170" contain />
      </div>
    </section>
  </v-footer>
</template>

<style scoped>

.footer-root {
  width: 100%;
  display: block;
  padding: 0 !important;
}

.footer-top {
  background-color: var(--color-orange);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.25rem;
}

.footer-top-inner {
  width: 100%;
  padding: 2rem 3rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.image-surface {
  width: 74px;
  height: 50px;
  background-color: transparent;
}

.footer-cta {
  background-color: #ebebeb;
}

.footer-cta-inner {
  margin: 0 auto;
  min-height: 360px;
  padding: 4rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 1.25rem;
}

.cta-title {
  font-size: clamp(2rem, 4vw, 3.2rem);
  font-weight: 800;
  line-height: 1.1;
  color: black;
}

.cta-text {
  font-size: 1.15rem;
  color: rgba(0, 0, 0, 0.45);
  max-width: 760px;
}

.cta-link {
  text-decoration: none;
}

.cta-btn {
  background-color: var(--color-orange);
  color: black;
  text-transform: none;
  letter-spacing: 0;
  font-size: 1.1rem;
  padding-inline: 1.8rem;
  min-height: 66px;
}

.footer-bottom {
  background-color: var(--color-beige);
  min-height: 215px;
  display: flex;
  align-items: center;
}

.footer-bottom-inner {
  width: 100%;
  margin: 0 auto;
  padding: 2rem 3rem;
  display: flex;
  align-items: center;
}
.footer-icon {
  width: 2rem;
  height: auto;
  display: block;
}

@media (max-width: 760px) {
  .footer-top-inner {
    padding: 1.5rem;
    gap: 1rem;
  }

  .image-surface {
    width: 56px;
    height: 40px;
  }

  .footer-cta-inner {
    min-height: 300px;
    padding: 3rem 1.25rem;
  }

  .footer-bottom-inner {
    padding: 1.5rem;
    justify-content: center;
  }
}
</style>
