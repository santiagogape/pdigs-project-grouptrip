<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { projectService } from '@/services/remote/firebase/projectService';
import type { Proyecto, Evento, Usuario } from '@/interfaces/models';
import openAIService from '@/services/remote/openAI/openAIService';

// Layout components
import NavBar from '@/components/testing/NavBar.vue';
import TheFooter from '@/components/testing/TheFooter.vue';
import EventModal from '@/components/EventModal.vue';
import ShareProjectDialog from '@/components/ShareModal.vue';
import LocationPicker from '@/components/LocationPicker.vue';
import EventsMapPanel from '@/components/EventsMapPanel.vue';
const route = useRoute();
const router = useRouter();
const projectId = route.params.id as string;

const showShareModal = ref(false);
const isInitializingTrip = ref(false);
const initializationError = ref('');
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
      const users = await projectService.getUsersByProject(projectId);
      miembros.value = [...miembros.value, ...users];
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

const activityTab = ref<'list' | 'calendar' | 'map'>('list')
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
  lat: null as number | null,
  lng: null as number | null,
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

// pestaña de mapa para ordenar eventos con ubicación por la hora
const mapEvents = computed(() => {
  return [...eventos.value]
    .filter((ev) => ev.lat != null && ev.lng != null)
    .sort((a, b) => a.fechaHoraInicio - b.fechaHoraInicio)
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
    lat: null,
    lng: null,
  }
}

const combineDateAndTimeToMillis = (dateStr: string, timeStr: string) => {
  const [yearStr, monthStr, dayStr] = dateStr.split('-')
  const [hoursStr, minutesStr] = timeStr.split(':')

  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)
  const hours = Number(hoursStr)
  const minutes = Number(minutesStr)

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    throw new Error('Fecha u hora inválida')
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0).getTime()
}

const parseIsoDateTimeToMillis = (value: string) => {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime()
}

const clampMillis = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value))
}

const createFallbackEventFromSuggestion = (
  suggestion: { nombre: string; tipo: string; precio?: number; lugar?: string; lat?: number | null; lng?: number | null },
  index: number,
  total: number,
  projectStart: number,
  projectEnd: number
): Evento => {
  const tripDuration = Math.max(projectEnd - projectStart, 60 * 60 * 1000)
  const eventDuration = Math.min(3 * 60 * 60 * 1000, Math.max(60 * 60 * 1000, Math.floor(tripDuration / Math.max(total, 1) / 2)))
  const usableSpan = Math.max(0, tripDuration - eventDuration)
  const offset = total <= 1 ? usableSpan / 2 : (usableSpan * index) / (total - 1)
  const startMillis = clampMillis(Math.round(projectStart + offset), projectStart, Math.max(projectStart, projectEnd - eventDuration))
  const endMillis = clampMillis(startMillis + eventDuration, startMillis + 15 * 60 * 1000, projectEnd)

  return {
    nombre: suggestion.nombre,
    tipo: suggestion.tipo,
    fechaHoraInicio: startMillis,
    fechaHoraFin: Math.max(endMillis, startMillis + 15 * 60 * 1000),
    precio: suggestion.precio,
    lugar: suggestion.lugar,
    lat: suggestion.lat,
    lng: suggestion.lng,
    gastos: []
  }
}

const normalizeSuggestedEvent = (
  suggestion: { nombre: string; tipo: string; fechaHoraInicio: string; fechaHoraFin: string; precio?: number; lugar?: string; lat?: number | null; lng?: number | null },
  index: number,
  total: number,
  projectStart: number,
  projectEnd: number
): Evento => {
  const startMillis = parseIsoDateTimeToMillis(suggestion.fechaHoraInicio)
  const endMillis = parseIsoDateTimeToMillis(suggestion.fechaHoraFin)

  if (startMillis === null || endMillis === null || endMillis <= startMillis) {
    return createFallbackEventFromSuggestion(suggestion, index, total, projectStart, projectEnd)
  }

  const safeStart = clampMillis(startMillis, projectStart, projectEnd)
  const originalDuration = Math.max(15 * 60 * 1000, endMillis - startMillis)
  const safeEnd = clampMillis(safeStart + originalDuration, safeStart + 15 * 60 * 1000, projectEnd)

  if (safeEnd <= safeStart) {
    return createFallbackEventFromSuggestion(suggestion, index, total, projectStart, projectEnd)
  }

  return {
    nombre: suggestion.nombre,
    tipo: suggestion.tipo,
    fechaHoraInicio: safeStart,
    fechaHoraFin: safeEnd,
    precio: suggestion.precio,
    lugar: suggestion.lugar,
    gastos: []
  }
}

const initializeTripWithAI = async () => {
  if (!proyecto.value || !projectId) {
    return
  }

  if (eventos.value.length > 0 && !confirm('Ya existen eventos en este viaje. ¿Quieres agregar también sugerencias iniciales generadas por IA?')) {
    return
  }

  isInitializingTrip.value = true
  initializationError.value = ''

  try {
    const suggestions = await openAIService.generateInitialProjectEvents({
      nombre: proyecto.value.destino,
      destino: proyecto.value.destino,
      descripcion: proyecto.value.descripcion,
      presupuesto: proyecto.value.presupuesto,
      fechaInicio: proyecto.value.fechaInicio,
      fechaFin: proyecto.value.fechaFin
    })

    if (!suggestions.length) {
      initializationError.value = 'La IA no devolvió eventos válidos para inicializar el viaje.'
      return
    }

    const projectStart = proyecto.value.fechaInicio
    const projectEnd = proyecto.value.fechaFin

    const eventsToCreate = suggestions.map((suggestion, index) =>
      normalizeSuggestedEvent(suggestion, index, suggestions.length, projectStart, projectEnd)
    )

    if (!eventsToCreate.length) {
      initializationError.value = 'La IA no devolvió eventos utilizables para inicializar el viaje.'
      return
    }

    for (const event of eventsToCreate) {
      await projectService.addEventToProject(projectId, event)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    initializationError.value = `No se pudieron generar eventos iniciales: ${message}`
  } finally {
    isInitializingTrip.value = false
  }
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
    precio: eventForm.value.precio ?? null,
    lugar: eventForm.value.lugar || null,
    lat: eventForm.value.lat ?? null,
    lng: eventForm.value.lng ?? null,
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
  };

const saveEventEdited = async (event: Evento) => {
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

// Lógica para el LocationPicker
const showLocationPicker = ref(false);

const handleLocationConfirm = (location: { lat: number; lng: number; name?: string }) => {
  eventForm.value.lugar = location.name || '';
  eventForm.value.lat = location.lat;
  eventForm.value.lng = location.lng;
  console.log('location:', location);
  showLocationPicker.value = false;
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

                <div class="d-flex ga-2">
                  <v-btn
                    color="grey-darken-2"
                    variant="tonal"
                    rounded="xl"
                    elevation="0"
                    prepend-icon="mdi-auto-fix"
                    :loading="isInitializingTrip"
                    @click="initializeTripWithAI"
                  >
                    Inicializar con IA
                  </v-btn>

                  <v-btn
                    color="indigo"
                    rounded="xl"
                    elevation="0"
                    prepend-icon="mdi-plus"
                    @click="eventDialog = true"
                  >
                    Nuevo evento
                  </v-btn>
                </div>
              </v-card-title>

              <v-card-text v-if="initializationError" class="px-6 pb-0">
                <v-alert type="warning" variant="tonal" density="compact">
                  {{ initializationError }}
                </v-alert>
              </v-card-text>

              <v-card-text class="pa-6 pt-0">
                <v-tabs v-model="activityTab" color="indigo" grow>
                  <v-tab value="list">Lista</v-tab>
                  <v-tab value="calendar">Calendario</v-tab>
                  <v-tab value="map">Mapa</v-tab>
                </v-tabs>

                <v-window v-model="activityTab" class="mt-4">
                  <v-window-item value="list">
                    <v-timeline class="actividades-timeline" side="end" align="start" density="compact" v-if="eventos.length">
                      <v-timeline-item
                        v-for="(ev, i) in eventos"
                        :key="i"
                        dot-color="indigo-lighten-4"
                        size="x-small"
                        style="width: 100%;"
                      >
                        <div class="d-flex align-start w-100">

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

                          <div class="align-self-end ml-auto d-flex">
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
                            />
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

                  <v-window-item value="map">
                    <div v-if="mapEvents.length" class="mt-2">
                      <EventsMapPanel :events="mapEvents" />
                    </div>

                    <div v-else class="text-center py-4 text-grey">
                      No hay actividades con coordenadas para mostrar en el mapa
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
                          append-inner-icon="mdi-map-marker"
                          @click:append-inner="showLocationPicker = true"
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
  <LocationPicker
    :isOpen="showLocationPicker"
    @close="showLocationPicker = false"
    @confirm="handleLocationConfirm"
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

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.actividades-timeline .v-timeline-item__body {
  flex: 1 1 auto;
  min-width: 0;
  width: 100% !important;
}
:deep(.v-timeline-item__body) {
  width: 100% !important;
}

.actividades-timeline .v-timeline-item__body > div {
  width: 100%;
}

.actividades-timeline .v-timeline-item__body .evento-row {
  display: flex;
  align-items: flex-start;
  width: 100%;
  gap: 16px;
}

.actividades-timeline .hora-col {
  min-width: 80px;
  display: flex;
  flex-direction: column;
}

.actividades-timeline .contenido-col {
  flex: 1 1 auto;
  min-width: 0;
}

.actividades-timeline .acciones-col {
  margin-left: auto;
  display: flex;
  align-items: flex-end;
  gap: 4px;
}
</style>
