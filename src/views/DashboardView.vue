<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '@/services/remote/firebase/config'
import { projectService } from '@/services/remote/firebase/projectService'
import type { Proyecto } from '@/interfaces/models'
import NavBar from '@/components/testing/NavBar.vue'
import TheFooter from '@/components/testing/TheFooter.vue'

const router = useRouter()
const proyectos = ref<Proyecto[]>([])
const loading = ref(true)
const errorMessage = ref('')

onMounted(async () => {
  const user = auth.currentUser
  if (!user) {
    router.push('/login')
    return
  }

  try {
    proyectos.value = await projectService.getProjectsByUser(user.uid)
  } catch (error) {
    console.error('Error cargando proyectos:', error)
    errorMessage.value = 'No se pudieron cargar tus viajes. Revisa tu conexión e inténtalo otra vez.'
  } finally {
    loading.value = false
  }
})

const irADetalle = (id: string) => {
  router.push({ name: 'ProjectDetail', params: { id } })
}

const formatFecha = (ts?: number) => {
  if (!ts) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(ts))
}

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value ?? 0)
</script>

<template>
  <v-app>
    <NavBar />
    <v-main class="gt-page">
      <v-container class="dashboard-wrap">
        <header class="dashboard-header">
          <div>
            <p class="gt-kicker">Panel de viajes</p>
            <h1 class="gt-title">Mis aventuras</h1>
            <p class="gt-muted">{{ proyectos.length }} viajes planeados</p>
          </div>

          <v-btn to="/new-project" class="gt-primary-btn" size="large" prepend-icon="mdi-plus">
            Nuevo viaje
          </v-btn>
        </header>

        <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-6">
          {{ errorMessage }}
        </v-alert>

        <div v-if="loading" class="loading-state gt-card">
          <v-progress-circular indeterminate color="red-darken-3" size="48" />
          <span>Cargando tus viajes...</span>
        </div>

        <v-row v-else-if="proyectos.length > 0">
          <v-col
            v-for="proyecto in proyectos"
            :key="proyecto.projectId"
            cols="12"
            sm="6"
            lg="4"
          >
            <v-card class="gt-card project-card" elevation="0" @click="irADetalle(proyecto.projectId)">
              <v-img
                :alt="`Imagen de portada del viaje a ${proyecto.destino}`"
                :src="proyecto.urlPortada || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=900&auto=format&fit=crop'"
                height="210"
                cover
              />

              <v-card-text class="project-body">
                <div class="project-topline">
                  <v-chip size="small" color="red-darken-3" variant="tonal">
                    {{ proyecto.destino }}
                  </v-chip>
                  <strong>{{ formatCurrency(proyecto.presupuesto) }}</strong>
                </div>

                <h2>{{ proyecto.descripcion || proyecto.destino }}</h2>
                <p>{{ formatFecha(proyecto.fechaInicio) }} - {{ formatFecha(proyecto.fechaFin) }}</p>
              </v-card-text>

              <v-card-actions class="project-actions">
                <v-btn variant="text" color="red-darken-3" append-icon="mdi-arrow-right">
                  Ver itinerario
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <section v-else class="empty-state gt-card">
          <v-icon icon="mdi-map-marker-plus-outline" size="64" color="red-darken-3" />
          <h2>Aún no tienes viajes</h2>
          <p>Crea tu primer proyecto y empieza a organizar destino, fechas y actividades.</p>
          <v-btn to="/new-project" class="gt-primary-btn" size="large" prepend-icon="mdi-plus">
            Crear mi primer viaje
          </v-btn>
        </section>
      </v-container>
    </v-main>
    <TheFooter />
  </v-app>
</template>

<style scoped>
.dashboard-wrap {
  /* width: min(1180px, calc(100% - 24px)); */
  padding-block: 3rem 4rem;
}

.dashboard-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
}

.dashboard-header h1 {
  font-size: clamp(2.4rem, 6vw, 4.2rem);
}

.loading-state,
.empty-state {
  min-height: 300px;
  display: grid;
  place-items: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
}

.empty-state h2 {
  color: var(--gt-text);
  font-weight: 850;
}

.empty-state p {
  max-width: 480px;
  color: var(--gt-muted);
}

.project-card {
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--gt-shadow-md) !important;
}

.project-body {
  padding: 1.25rem !important;
}

.project-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.85rem;
}

.project-body h2 {
  min-height: 3.2rem;
  color: var(--gt-text);
  font-size: 1.2rem;
  font-weight: 850;
  line-height: 1.25;
}

.project-body p {
  margin-top: 0.6rem;
  color: var(--gt-muted);
}

.project-actions {
  padding: 0 1rem 1rem !important;
}

@media (max-width: 700px) {
  .dashboard-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
