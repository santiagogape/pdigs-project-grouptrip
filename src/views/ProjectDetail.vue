<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { projectService } from '@/services/remote/firebase/projectService';
import type { Proyecto, Evento, Usuario } from '@/interfaces/models';

// Layout components
import NavBar from '@/components/testing/NavBar.vue';
import TheFooter from '@/components/testing/TheFooter.vue';
import EventModal from '@/components/EventModal.vue';
import ShareProjectDialog from '@/components/ShareModal.vue';

const route = useRoute();
const router = useRouter();
const projectId = route.params.id as string;

const showShareModal = ref(false);
const shareLink = computed(() => {
  return `${window.location.origin}/share/${projectId}`;
});
// Estados reactivos
const proyecto = ref<Proyecto | null>(null);
const eventos = ref<Evento[]>([]);
const miembros = ref<Usuario[]>([]);
const loading = ref(true);
const primerMiembro = computed(() => miembros.value[0] ?? null);

// Limpieza de suscripciones
let unsubProject: () => void;
let unsubEvents: () => void;

// Lógica para obtener miembros reales
const cargarMiembros = async () => {
  try {
    // 1. Buscamos en la tabla de relación 'proyecto_usuario'
    // Nota: Podrías añadir una función getUsersByProject en tu projectService similar a getProjectsByUser
    // Por ahora, lo simularemos consumiendo tu getUser para cada relación
    // En una app real, lo ideal es una query directa a la tabla de relación

    // Simulación de carga de miembros (dueño + colaboradores)
    if (proyecto.value?.owner) {
      const owner = await projectService.getUser(proyecto.value.owner);
      if (owner) miembros.value = [owner];
    }
  } catch (e) {
    console.error("Error cargando miembros:", e);
  }
};

onMounted(async () => {
  if (!projectId) {
    router.push('/');
    return;
  }

  // 1. Suscribirse al Proyecto (Tiempo Real)
  unsubProject = projectService.subscribeToProject(projectId, (data) => {
    if (data) {
      proyecto.value = data;
      // Una vez tenemos el proyecto, cargamos sus miembros reales
      cargarMiembros();
    }
    loading.value = false;
  });

  // 2. Suscribirse a Eventos (Tiempo Real)
  unsubEvents = projectService.subscribeToEvents(projectId, (data) => {
    // Ordenar eventos por fecha antes de guardarlos
    eventos.value = data.sort((a, b) => a.fechaHoraInicio - b.fechaHoraInicio);
  });
});

onUnmounted(() => {
  if (unsubProject) unsubProject();
  if (unsubEvents) unsubEvents();
});

// Formateadores
const formatHora = (ts?: number) => ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

const activityTab = ref<'list' | 'calendar'>('list')
const eventDialog = ref(false)
const eventFormRef = ref()

const eventForm = ref({
  nombre: '',
  tipo: '',
  fecha: '',
  horaInicio: '',
  horaFin: '',
  precio: null as number | null,
  lugar: '',
})

const calendarEvents = computed(() => {
  return [...eventos.value]
    .sort((a, b) => a.fechaHoraInicio - b.fechaHoraInicio)
    .map((ev) => ({
      title: ev.nombre,
      start: new Date(ev.fechaHoraInicio),
      end: new Date(ev.fechaHoraFin),
      color: 'indigo',
      allDay: false,
    }))
})

const resetEventForm = () => {
  eventForm.value = {
    nombre: '',
    tipo: '',
    fecha: '',
    horaInicio: '',
    horaFin: '',
    precio: null,
    lugar: '',
  }
}

const combineDateAndTimeToMillis = (dateStr: string, timeStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes] = timeStr.split(':').map(Number)

  return new Date(year, month - 1, day, hours, minutes, 0, 0).getTime()
}

const submitEvent = async () => {
  if (
    !projectId ||
    !eventForm.value.nombre ||
    !eventForm.value.tipo ||
    !eventForm.value.fecha ||
    !eventForm.value.horaInicio ||
    !eventForm.value.horaFin
  ) {
    alert('Completa los campos obligatorios')
    return
  }

  const fechaHoraInicio = combineDateAndTimeToMillis(
    eventForm.value.fecha,
    eventForm.value.horaInicio,
  )

  const fechaHoraFin = combineDateAndTimeToMillis(
    eventForm.value.fecha,
    eventForm.value.horaFin,
  )

  if (fechaHoraFin <= fechaHoraInicio) {
    alert('La hora de fin debe ser posterior a la hora de inicio')
    return
  }

  const newEvent: Evento = {
    nombre: eventForm.value.nombre,
    tipo: eventForm.value.tipo,
    fechaHoraInicio,
    fechaHoraFin,
    precio: eventForm.value.precio ?? undefined,
    lugar: eventForm.value.lugar || undefined,
    gastos: [],
  }

  try {
    await projectService.addEventToProject(projectId, newEvent)
    eventDialog.value = false
    resetEventForm()
  } catch (e) {
    console.error('Error creando evento:', e)
    alert('No se pudo crear el evento')
  }
}
//Abrir modal de edición de evento
  const showEventModal = ref(false);
  const eventoSeleccionado = ref<Evento | null>(null);

  const openModal = (evento: Evento) => {
    eventoSeleccionado.value = evento;
    showEventModal.value = true;
    console.log(evento.nombre)
  };

const saveEventEdited = async (event: Evento) => {
  console.log('Evento editado:', event.id);
  try {
    await projectService.updateEvent(projectId, event);
    showEventModal.value = false;
  } catch (e) {
    console.error('Error de edición evento:', e);
    alert('No se pudo editar el evento');
  }
};

const deleteEvent = async (event: Evento) => {
  if (!confirm(`¿Eliminar evento "${event.nombre}"?`)) return;

  try {
    if (!projectId || !event.id) {
      alert('ID de proyecto o evento no válido');
      return;
    }
    await projectService.deleteEvent(projectId, event.id);
  } catch (e) {
    console.error('Error eliminando evento:', e);
    alert('No se pudo eliminar el evento');
  }
};
</script>

<template>
  <v-app>
    <NavBar />
    <v-main class="dashboard-bg">
      <v-container v-if="loading" class="fill-height justify-center">
        <v-progress-circular indeterminate color="indigo"></v-progress-circular>
      </v-container>

      <v-container v-else-if="proyecto" class="py-10">
        <header class="d-flex justify-space-between align-center mb-8">
          <div>
            <h1 class="text-h4 font-weight-black color-navy">{{ proyecto.destino }}</h1>
            <p class="text-subtitle-1 text-grey-darken-1">{{ proyecto.descripcion }}</p>
          </div>
          <div>
            <v-btn
              class="px-6"
              style="margin-right: 1rem;"
              elevation="0"
              rounded="xl"
              color="#4caf50"
              prepend-icon="mdi-export-variant"
              variant="flat"
              @click="showShareModal = true"
            >
              Share
            </v-btn>
            <v-btn color="indigo" rounded="xl" elevation="0" class="px-6">Dashboard</v-btn>
          </div>
        </header>

        <v-row >
          <v-col cols="12" md="8" class="card-container">
            <v-card class="custom-card mb-6">
              <v-card-text class="pa-6">
                <v-row>
                  <v-col cols="4">
                    <span class="label-text">Destino</span>
                    <div class="value-text">{{ proyecto.destino }}</div>
                  </v-col>
                  <v-col cols="4">
                    <span class="label-text">Presupuesto</span>
                    <div class="value-text">${{ proyecto.presupuesto }}</div>
                  </v-col>
                  <v-col cols="4">
                    <span class="label-text">Estado</span>
                    <div><v-chip size="small" color="success" variant="flat">● Activo</v-chip></div>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <v-card class="custom-card card-container mb-6">
              <v-card-title class="pa-6 font-weight-bold d-flex justify-space-between align-center">
                <span>Actividades</span>

                <v-btn
                  color="indigo"
                  rounded="xl"
                  elevation="0"
                  prepend-icon="mdi-plus"
                  @click="eventDialog = true"
                >
                  Nuevo evento
                </v-btn>
              </v-card-title>

              <v-card-text class="pa-6 pt-0">
                <v-tabs v-model="activityTab" color="indigo" grow>
                  <v-tab value="list">Lista</v-tab>
                  <v-tab value="calendar">Calendario</v-tab>
                </v-tabs>

                <v-window v-model="activityTab" class="mt-4">
                  <v-window-item value="list">
                    <v-timeline side="end" align="start" density="compact" v-if="eventos.length">
                      <v-timeline-item
                        v-for="(ev, i) in eventos"
                        :key="i"
                        dot-color="indigo-lighten-4"
                        size="x-small"
                      >
                        <div class="d-flex align-start">

                          <div class="d-flex flex-column" style="min-width: 80px">
                            <span class="text-caption font-weight-bold text-indigo">
                              {{ formatHora(ev.fechaHoraInicio) }}
                            </span>
                            <span class="text-caption text-grey-lighten-1">|</span>
                            <span class="text-caption font-weight-bold text-indigo">
                              {{ formatHora(ev.fechaHoraFin) }}
                            </span>
                          </div>

                          <div class="flex-grow-1 ml-4">
                            <div class="text-body-2 font-weight-bold">{{ ev.nombre }}</div>
                            <div class="text-caption text-grey">{{ ev.tipo }}</div>

                            <div v-if="ev.lugar" class="text-caption text-grey-darken-1">
                              <v-icon size="x-small" icon="mdi-map-marker" /> {{ ev.lugar }}
                            </div>

                            <div v-if="ev.precio != null" class="text-caption text-grey-darken-1">
                              <v-icon size="x-small" icon="mdi-currency-usd" /> {{ ev.precio }}
                            </div>
                          </div>

                          <div class="align-self-center">
                            <v-btn
                              icon="mdi-pencil"
                              variant="text"
                              size="small"
                              color="grey-darken-1"
                              @click="openModal(ev)"
                            />
                            <v-btn
                              icon="mdi-delete"
                              variant="text"
                              color="error"
                              size="small"
                              @click="deleteEvent(ev)"
                            ></v-btn>
                          </div>

                        </div>
                      </v-timeline-item>
                    </v-timeline>

                    <div v-else class="text-center py-4 text-grey">
                      No hay actividades programadas
                    </div>
                  </v-window-item>

                  <v-window-item value="calendar">
                    <div v-if="calendarEvents.length" class="mt-2">
                      <v-calendar
                        view-mode="month"
                        :events="calendarEvents"
                      />
                    </div>

                    <div v-else class="text-center py-4 text-grey">
                      No hay actividades para mostrar en el calendario
                    </div>
                  </v-window-item>
                </v-window>
              </v-card-text>
            </v-card>

            <v-dialog v-model="eventDialog" max-width="640">
              <v-card class="custom-card">
                <v-card-title class="pa-6 font-weight-bold">
                  Crear evento
                </v-card-title>

                <v-card-text class="px-6 pb-2">
                  <v-form ref="eventFormRef">
                    <v-row>
                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="eventForm.nombre"
                          label="Nombre"
                          variant="outlined"
                          required
                        />
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="eventForm.tipo"
                          label="Tipo"
                          variant="outlined"
                          required
                        />
                      </v-col>

                      <v-col cols="12" md="4">
                        <v-text-field
                          v-model="eventForm.fecha"
                          label="Fecha"
                          type="date"
                          variant="outlined"
                          required
                        />
                      </v-col>

                      <v-col cols="12" md="4">
                        <v-text-field
                          v-model="eventForm.horaInicio"
                          label="Hora inicio"
                          type="time"
                          variant="outlined"
                          required
                        />
                      </v-col>

                      <v-col cols="12" md="4">
                        <v-text-field
                          v-model="eventForm.horaFin"
                          label="Hora fin"
                          type="time"
                          variant="outlined"
                          required
                        />
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model.number="eventForm.precio"
                          label="Precio"
                          type="number"
                          min="0"
                          variant="outlined"
                        />
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="eventForm.lugar"
                          label="Lugar"
                          variant="outlined"
                        />
                      </v-col>
                    </v-row>
                  </v-form>
                </v-card-text>

                <v-card-actions class="px-6 pb-6">
                  <v-spacer />

                  <v-btn
                    variant="outlined"
                    rounded="xl"
                    @click="eventDialog = false"
                  >
                    Cancelar
                  </v-btn>

                  <v-btn
                    color="indigo"
                    rounded="xl"
                    elevation="0"
                    @click="submitEvent"
                  >
                    Guardar evento
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
          </v-col>

          <v-col cols="12" md="4" class="card-container">
            <v-card class="custom-card mb-6">
              <v-card-title class="pa-6 text-subtitle-1 font-weight-bold">Miembros del Grupo</v-card-title>
              <v-card-text class="px-6 pb-6 d-flex align-center">
                <v-avatar v-for="user in miembros" :key="user.uid" size="40" class="avatar-stack">
                  <v-img :src="user.urlPerfil || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'"></v-img>
                  <v-tooltip activator="parent" location="top">{{ user.nombre }}</v-tooltip>
                </v-avatar>
                <v-btn icon="mdi-plus" variant="tonal" size="small" color="grey" class="ml-2"></v-btn>
              </v-card-text>
            </v-card>

            <v-card class="custom-card card-container mb-6">
              <v-card-title class="pa-6 text-subtitle-1 font-weight-bold">Actividad</v-card-title>
              <v-list bg-color="transparent" density="compact">
                <v-list-item v-if="primerMiembro">
                  <template v-slot:prepend>
                    <v-avatar size="30"><v-img :src="primerMiembro.urlPerfil"></v-img></v-avatar>
                  </template>
                  <v-list-item-title class="text-caption">
                    <strong>{{ primerMiembro.nombre }}</strong> creó este proyecto
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
    <TheFooter />
  </v-app>
  <EventModal
    :visible="showEventModal"
    :evento="eventoSeleccionado"
    @close="showEventModal = false"
    @save="saveEventEdited"
  />
  <ShareProjectDialog
    v-model="showShareModal"
    :share-link="shareLink"
  />
</template>

<style scoped>
/* Fondo general del Dashboard */
.dashboard-bg {
  background-color: #f0f2f5 !important;
  min-height: 100vh;
}

.card-container {
  /* Para que las cartas tengan la misma altura */
  margin: 10px 0;
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
