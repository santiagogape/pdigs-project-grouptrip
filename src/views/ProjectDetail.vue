<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { projectService } from '@/services/remote/firebase/projectService'; // Ajusta la ruta a tu API
import type { Proyecto, Evento } from '@/interfaces/models';
import NavBar from '@/components/testing/NavBar.vue';
import TheFooter from '@/components/testing/TheFooter.vue';

const route = useRoute();
const router = useRouter();
const projectId = route.params.id as string;

const proyecto = ref<Proyecto | null>(null);
const eventos = ref<Evento[]>([]);
const loading = ref(true);

// Suscripciones para tiempo real
let unsubscribeProject: () => void;
let unsubscribeEvents: () => void;

onMounted(() => {
  if (!projectId) {
    router.push('/');
    return;
  }

  // Escuchar cambios en el proyecto
  unsubscribeProject = projectService.subscribeToProject(projectId, (data) => {
    proyecto.value = data;
    loading.value = false;
  });

  // Escuchar cambios en los eventos (itinerario)
  unsubscribeEvents = projectService.subscribeToEvents(projectId, (data) => {
    eventos.value = data;
  });
});

onUnmounted(() => {
  if (unsubscribeProject) unsubscribeProject();
  if (unsubscribeEvents) unsubscribeEvents();
});

const formatFecha = (timestamp?: number) => {
  if (timestamp == null) return '-';
  return new Date(timestamp).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const formatHora = (timestamp?: number) => {
  if (timestamp == null) return '10:00';
  return new Date(timestamp).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });
};
</script>


<template>
  <v-app>
    <NavBar />
    <v-main class="dashboard-bg">
      <v-container class="py-10 px-6" fluid>
        <header class="d-flex justify-space-between align-center mb-8">
          <div>
            <h1 class="text-h4 font-weight-black color-navy">{{ proyecto?.destino || 'Cargando...' }}</h1>
            <p class="text-subtitle-1 text-grey-darken-1">Panel de control del viaje</p>
          </div>
          <v-btn color="indigo-darken-1" rounded="xl" elevation="2" class="px-6 text-capitalize font-weight-bold">
            Dashboard
          </v-btn>
        </header>

        <v-row>
          <v-col cols="12" md="8">
            
            <v-card class="custom-card mb-6" elevation="0">
              <v-card-title class="d-flex justify-space-between align-center px-6 py-4">
                <span class="text-h6 font-weight-bold">Overview</span>
                <v-btn icon="mdi-dots-horizontal" variant="text" density="comfortable"></v-btn>
              </v-card-title>
              <v-divider class="mx-6"></v-divider>
              <v-card-text class="pa-6">
                <v-row>
                  <v-col cols="4">
                    <span class="label-text">Destination</span>
                    <div class="value-text">{{ proyecto?.destino }}</div>
                  </v-col>
                  <v-col cols="4">
                    <span class="label-text">Dates</span>
                    <div class="value-text">{{ formatFecha(proyecto?.fechaInicio) }}</div>
                  </v-col>
                  <v-col cols="4">
                    <span class="label-text">Status</span>
                    <div>
                      <v-chip size="small" color="success" variant="flat" class="font-weight-bold px-3">
                        ● Planning
                      </v-chip>
                    </div>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <v-card class="custom-card" elevation="0">
              <v-card-title class="pa-6 font-weight-bold text-h6">Featured Itinerary</v-card-title>
              <v-card-text class="pa-6 pt-0">
                <v-row>
                  <v-col cols="12" sm="5">
                    <v-img 
                      :src="proyecto?.urlPortada" 
                      cover 
                      height="240" 
                      rounded="xl" 
                      class="mb-4 shadow-sm"
                    ></v-img>
                    <div class="text-h6 font-weight-bold mb-1">Día 1: Llegada</div>
                    <p class="text-body-2 text-grey-darken-1 mb-4">Plan generado por IA para tu primera estancia.</p>
                    <v-btn variant="flat" color="indigo-lighten-5" class="text-indigo-darken-3 font-weight-bold" rounded="lg" prepend-icon="mdi-sparkles" block>
                      Generar con IA
                    </v-btn>
                  </v-col>
                  <v-col cols="12" sm="7">
                    <v-timeline side="end" align="start" density="compact" line-color="grey-lighten-3">
                      <v-timeline-item v-for="(ev, i) in eventos" :key="i" dot-color="indigo-lighten-3" size="x-small">
                        <div class="d-flex justify-space-between align-center">
                          <span class="text-caption font-weight-black text-indigo">{{ formatHora(ev.fechaHoraInicio) }}</span>
                          <div class="flex-grow-1 ml-4">
                            <div class="text-body-2 font-weight-bold">{{ ev.nombre }}</div>
                            <div class="text-caption text-grey-darken-1">{{ proyecto?.destino }}</div>
                          </div>
                        </div>
                      </v-timeline-item>
                    </v-timeline>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="4">
            
            <v-card class="custom-card mb-6" elevation="0">
              <v-card-title class="pa-6 text-h6 font-weight-bold">Group Members</v-card-title>
              <v-card-text class="px-6 pb-6 d-flex align-center">
                <v-avatar v-for="n in 5" :key="n" size="40" class="avatar-stack border-white">
                  <v-img :src="`https://i.pravatar.cc/100?u=${n*20}`"></v-img>
                </v-avatar>
                <v-btn icon="mdi-plus" variant="tonal" size="small" color="grey" class="ml-2"></v-btn>
              </v-card-text>
            </v-card>

            <v-card class="custom-card mb-6" elevation="0">
              <v-card-title class="pa-6 text-h6 font-weight-bold">Shared Budget</v-card-title>
              <v-card-text class="px-6 pb-6">
                <div class="label-text mb-1">Overview</div>
                <div class="text-h4 font-weight-black color-navy mb-4">${{ proyecto?.presupuesto }}</div>
                <v-progress-linear color="teal-accent-4" model-value="35" height="10" rounded></v-progress-linear>
                <div class="d-flex justify-space-between mt-3">
                  <span class="text-caption font-weight-medium">Spending</span>
                  <span class="text-caption font-weight-bold text-error">$400.00</span>
                </div>
              </v-card-text>
            </v-card>

            <v-card class="custom-card" elevation="0">
              <v-card-title class="pa-6 text-h6 font-weight-bold">Recent Activity</v-card-title>
              <v-card-text class="pa-0">
                <v-list lines="two" bg-color="white">
                  <v-list-item v-for="n in 3" :key="n" class="px-6">
                    <template v-slot:prepend>
                      <v-avatar size="36"><v-img src="https://i.pravatar.cc/100?u=99"></v-img></v-avatar>
                    </template>
                    <v-list-item-title class="text-body-2"><strong>Ana</strong> añadió una actividad</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">Hace 2 horas</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
    <TheFooter />
  </v-app>
</template>

<style scoped>
/* Fondo general del Dashboard */
.dashboard-bg {
  background-color: #f0f2f5 !important;
  min-height: 100vh;
}

/* Forzamos que las cartas sean blancas y tengan bordes suaves */
.custom-card {
  background-color: #ffffff !important;
  color: #1a1a1a !important;
  border-radius: 24px !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
  transition: transform 0.2s ease;
}

.custom-card:hover {
  transform: translateY(-2px);
}

/* Estilos de texto */
.color-navy {
  color: #1a202c;
}

.label-text {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #94a3b8;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.value-text {
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
}

/* Efecto de Avatares encimados */
.avatar-stack {
  margin-left: -12px;
  border: 3px solid white !important;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.avatar-stack:first-child {
  margin-left: 0;
}

/* Sombras suaves */
.shadow-sm {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
</style>