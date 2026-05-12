<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { auth } from '@/services/remote/firebase/config';
import { projectService } from '@/services/remote/firebase/projectService';
import type { Proyecto } from '@/interfaces/models';

// Componentes
import NavBar from '@/components/testing/NavBar.vue';
import TheFooter from '@/components/testing/TheFooter.vue';

const router = useRouter();
const proyectos = ref<Proyecto[]>([]);
const loading = ref(true);

onMounted(async () => {
  const user = auth.currentUser;
  if (!user) {
    router.push('/login');
    return;
  }

  try {
    // Cargamos los proyectos del usuario actual
    proyectos.value = await projectService.getProjectsByUser(user.uid);
  } catch (error) {
    console.error("Error cargando proyectos:", error);
  } finally {
    loading.value = false;
  }
});

const irADetalle = (id: string) => {
  router.push({ name: 'ProjectDetail', params: { id } });
};

const formatFecha = (ts?: number) => {
  if (!ts) return '---';
  return new Date(ts).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
};
</script>

<template>
  <v-app>
    <NavBar />
    <v-main class="dashboard-bg">
      <v-container class="py-10">

        <header class="d-flex justify-space-between align-end mb-10" style="margin-bottom: 2rem;">
          <div>
            <h1 class="auth-title">Mis Aventuras</h1>
            <p class="auth-subtitle">Tienes {{ proyectos.length }} viajes planeados</p>
          </div>
          <v-btn
            to="/new-project"
            color="var(--color-orange)"
            elevation="0"
            rounded="lg"
            size="large"
            class="create-btn"
          >
            <v-icon start>mdi-plus</v-icon>
            Nuevo Viaje
          </v-btn>
        </header>

        <div v-if="loading" class="text-center py-12">
          <v-progress-circular indeterminate color="var(--color-orange)" size="64"></v-progress-circular>
        </div>

        <v-row v-else-if="proyectos.length > 0">
          <v-col
            v-for="proyecto in proyectos"
            :key="proyecto.projectId"
            cols="12" sm="6" lg="4"
          >
            <v-card class="project-card" elevation="0" @click="irADetalle(proyecto.projectId)">
              <v-img
                :src="proyecto.urlPortada"
                height="220"
                cover
                class="align-end text-white"
              >
                <div class="card-overlay pa-4">
                  <v-chip size="x-small" color="var(--color-orange)" class="mb-2 font-weight-bold" label>
                    {{ proyecto.destino }}
                  </v-chip>
                  <h3 class="text-h5 font-weight-black">{{ proyecto.descripcion }}</h3>
                </div>
              </v-img>

              <v-card-text class="pa-5 bg-white">
                <div class="d-flex justify-space-between align-center mb-4">
                  <div class="d-flex align-center">
                    <v-icon size="small" color="grey-darken-1" class="mr-1">mdi-calendar-range</v-icon>
                    <span class="text-caption font-weight-bold text-grey-darken-2">
                      {{ formatFecha(proyecto.fechaInicio) }} - {{ formatFecha(proyecto.fechaFin) }}
                    </span>
                  </div>
                  <div class="text-caption font-weight-black text-indigo">
                    ${{ proyecto.presupuesto }}
                  </div>
                </div>

                <p class="project-desc text-truncate text-body-2">
                  {{ proyecto.descripcion || 'Sin descripción disponible para este viaje.' }}
                </p>
              </v-card-text>

              <v-divider></v-divider>

              <v-card-actions class="pa-4 bg-white justify-end">
                <v-btn variant="text" color="black" icon="mdi-share-variant" size="small"></v-btn>
                <v-btn variant="flat" color="black" rounded="lg" class="text-capitalize px-4">
                  Ver Itinerario
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <v-row v-else justify="center">
          <v-col cols="12" md="6" class="text-center py-12">
            <v-avatar size="120" color="var(--color-beige)" class="mb-6 border-black">
              <v-icon size="60" color="black">mdi-map-marker-off-outline</v-icon>
            </v-avatar>
            <h2 class="text-h5 font-weight-bold mb-2">Aún no tienes viajes</h2>
            <p class="text-grey-darken-1 mb-6">Comienza a planificar tu próxima aventura ahora mismo.</p>
            <v-btn to="/new-project" color="var(--color-orange)" rounded="xl" size="x-large" elevation="0">
              Crear mi primer viaje
            </v-btn>
          </v-col>
        </v-row>

      </v-container>
    </v-main>
    <TheFooter />
  </v-app>
</template>

<style scoped>
.dashboard-bg {
  background-color: #ebebeb; /* Consistente con el login/register */
  min-height: 100vh;
}

/* Tipografía audaz tipo Footer */
.auth-title {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800;
  line-height: 1.1;
  color: black;
}

.auth-subtitle {
  font-size: 1.15rem;
  color: rgba(0, 0, 0, 0.45);
}

/* Tarjeta de Proyecto con bordes marcados */
.project-card {
  border: 2px solid black !important;
  border-radius: 20px !important;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.project-card:hover {
  transform: translateY(-8px);
  box-shadow: 10px 10px 0px rgba(0,0,0,1) !important; /* Efecto Neobrutalista */
}

.card-overlay {
  background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%);
  width: 100%;
}

.project-desc {
  color: #666;
  max-width: 100%;
}

.create-btn {
  border: 2px solid black !important;
  font-weight: 800 !important;
  text-transform: none !important;
}

.border-black {
  border: 2px solid black !important;
}

.bg-white {
  background-color: white !important;
}

.v-btn {
  padding: 1rem;
}
</style>
