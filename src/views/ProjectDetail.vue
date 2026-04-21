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
import EventsMapPanel from '@/components/EventsMapPanel.vue';

const route = useRoute();
const router = useRouter();
const projectId = route.params.id as string;

const showShareModal = ref(false);
const isInitializingTrip = ref(false);
const initializationError = ref('');
const shareLink = computed(() => `${window.location.origin}/share/${projectId}`);

// Estados reactivos
const proyecto = ref<Proyecto | null>(null);
const eventos = ref<Evento[]>([]);
const miembros = ref<Usuario[]>([]);
const loading = ref(true);
const primerMiembro = computed(() => miembros.value[0] ?? null);

// Modal único para crear/editar
const showEventModal = ref(false);
const eventoSeleccionado = ref<Evento | null>(null);

// Limpieza de suscripciones
let unsubProject: (() => void) | undefined;
let unsubEvents: (() => void) | undefined;

const cargarMiembros = async () => {
  try {
    if (proyecto.value?.owner) {
      const owner = await projectService.getUser(proyecto.value.owner);
      if (owner) miembros.value = [owner];

      const users = await projectService.getUsersByProject(projectId);
      miembros.value = [
        ...miembros.value,
        ...users.filter(user => !miembros.value.some(member => member.uid === user.uid))
      ];
    }
  } catch (e) {
    console.error('Error cargando miembros:', e);
  }
};

onMounted(async () => {
  if (!projectId) {
    router.push('/');
    return;
  }

  unsubProject = projectService.subscribeToProject(projectId, (data) => {
    if (data) {
      proyecto.value = data;
      cargarMiembros();
    }
    loading.value = false;
  });

  unsubEvents = projectService.subscribeToEvents(projectId, (data) => {
    eventos.value = [...data].sort(compareEventos);
  });
});

onUnmounted(() => {
  if (unsubProject) unsubProject();
  if (unsubEvents) unsubEvents();
});

// Helpers de fecha y hora
const formatDateNumberToInput = (value?: number | null) => {
  if (!value) return '';
  const str = String(value).padStart(8, '0');
  const day = str.slice(0, 2);
  const month = str.slice(2, 4);
  const year = str.slice(4, 8);
  return `${year}-${month}-${day}`;
};

const formatTimeNumberToInput = (value?: number | null) => {
  if (value === null || value === undefined) return '';
  const str = String(value).padStart(4, '0');
  const hours = str.slice(0, 2);
  const minutes = str.slice(2, 4);
  return `${hours}:${minutes}`;
};

const eventoStartDate = (ev: Evento) => {
  const dateStr = formatDateNumberToInput(ev.fechaInicio);
  const timeStr = formatTimeNumberToInput(ev.horaInicio) || '00:00';
  return new Date(`${dateStr}T${timeStr}:00`);
};

const eventoEndDate = (ev: Evento) => {
  const dateStr = formatDateNumberToInput(ev.fechaFin);
  const timeStr = formatTimeNumberToInput(ev.horaFin) || '00:00';
  return new Date(`${dateStr}T${timeStr}:00`);
};

const compareEventos = (a: Evento, b: Evento) => {
  return eventoStartDate(a).getTime() - eventoStartDate(b).getTime();
};

const formatHora = (hora?: number | null) => {
  if (hora === null || hora === undefined) return '--:--';
  return formatTimeNumberToInput(hora);
};

const formatFecha = (fecha?: number | null) => {
  if (!fecha) return '--/--/----';
  const str = String(fecha).padStart(8, '0');
  const day = str.slice(0, 2);
  const month = str.slice(2, 4);
  const year = str.slice(4, 8);
  return `${day}/${month}/${year}`;
};

const formatRangoEvento = (ev: Evento) => {
  const mismaFecha = ev.fechaInicio === ev.fechaFin;

  if (mismaFecha) {
    return `${formatFecha(ev.fechaInicio)} · ${formatHora(ev.horaInicio)} - ${formatHora(ev.horaFin)}`;
  }

  return `${formatFecha(ev.fechaInicio)} ${formatHora(ev.horaInicio)} → ${formatFecha(ev.fechaFin)} ${formatHora(ev.horaFin)}`;
};

const parseIsoDateTimeToDate = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const dateToDateNumber = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return Number(`${day}${month}${year}`);
};

const dateToTimeNumber = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return Number(`${hours}${minutes}`);
};

const clampDate = (value: Date, min: Date, max: Date) => {
  return new Date(Math.min(max.getTime(), Math.max(min.getTime(), value.getTime())));
};

const activityTab = ref<'list' | 'calendar' | 'map'>('list');

const calendarEvents = computed(() => {
  return [...eventos.value]
    .sort(compareEventos)
    .map((ev) => ({
      title: ev.nombre,
      start: eventoStartDate(ev),
      end: eventoEndDate(ev),
      color: 'indigo',
      allDay: false,
    }));
});

const mapEvents = computed(() => {
  return [...eventos.value]
    .filter((ev) => ev.lat != null && ev.lng != null)
    .sort(compareEventos);
});

const createFallbackEventFromSuggestion = (
  suggestion: { nombre: string; tipo: string; precio?: number; lugar?: string; lat?: number | null; lng?: number | null },
  index: number,
  total: number,
  projectStart: Date,
  projectEnd: Date
): Evento => {
  const tripDuration = Math.max(projectEnd.getTime() - projectStart.getTime(), 60 * 60 * 1000);
  const eventDuration = Math.min(
    3 * 60 * 60 * 1000,
    Math.max(60 * 60 * 1000, Math.floor(tripDuration / Math.max(total, 1) / 2))
  );

  const usableSpan = Math.max(0, tripDuration - eventDuration);
  const offset = total <= 1 ? usableSpan / 2 : (usableSpan * index) / (total - 1);

  const startDate = clampDate(
    new Date(Math.round(projectStart.getTime() + offset)),
    projectStart,
    new Date(Math.max(projectStart.getTime(), projectEnd.getTime() - eventDuration))
  );

  const endDate = clampDate(
    new Date(startDate.getTime() + eventDuration),
    new Date(startDate.getTime() + 15 * 60 * 1000),
    projectEnd
  );

  return {
    nombre: suggestion.nombre,
    tipo: suggestion.tipo,
    fechaInicio: dateToDateNumber(startDate),
    fechaFin: dateToDateNumber(endDate),
    horaInicio: dateToTimeNumber(startDate),
    horaFin: dateToTimeNumber(endDate),
    precio: suggestion.precio ?? null,
    lugar: suggestion.lugar ?? null,
    lat: suggestion.lat ?? null,
    lng: suggestion.lng ?? null,
    optional: false,
    gastos: []
  };
};

const normalizeSuggestedEvent = (
  suggestion: { nombre: string; tipo: string; fechaHoraInicio: string; fechaHoraFin: string; precio?: number; lugar?: string; lat?: number | null; lng?: number | null },
  index: number,
  total: number,
  projectStart: Date,
  projectEnd: Date
): Evento => {
  const startDate = parseIsoDateTimeToDate(suggestion.fechaHoraInicio);
  const endDate = parseIsoDateTimeToDate(suggestion.fechaHoraFin);

  if (!startDate || !endDate || endDate.getTime() <= startDate.getTime()) {
    return createFallbackEventFromSuggestion(suggestion, index, total, projectStart, projectEnd);
  }

  const safeStart = clampDate(startDate, projectStart, projectEnd);
  const originalDuration = Math.max(15 * 60 * 1000, endDate.getTime() - startDate.getTime());

  const safeEnd = clampDate(
    new Date(safeStart.getTime() + originalDuration),
    new Date(safeStart.getTime() + 15 * 60 * 1000),
    projectEnd
  );

  if (safeEnd.getTime() <= safeStart.getTime()) {
    return createFallbackEventFromSuggestion(suggestion, index, total, projectStart, projectEnd);
  }

  return {
    nombre: suggestion.nombre,
    tipo: suggestion.tipo,
    fechaInicio: dateToDateNumber(safeStart),
    fechaFin: dateToDateNumber(safeEnd),
    horaInicio: dateToTimeNumber(safeStart),
    horaFin: dateToTimeNumber(safeEnd),
    precio: suggestion.precio ?? null,
    lugar: suggestion.lugar ?? null,
    lat: suggestion.lat ?? null,
    lng: suggestion.lng ?? null,
    optional: false,
    gastos: []
  };
};

const initializeTripWithAI = async () => {
  if (!proyecto.value || !projectId) return;

  if (
    eventos.value.length > 0 &&
    !confirm('Ya existen eventos en este viaje. ¿Quieres agregar también sugerencias iniciales generadas por IA?')
  ) {
    return;
  }

  isInitializingTrip.value = true;
  initializationError.value = '';

  try {
    const suggestions = await openAIService.generateInitialProjectEvents({
      nombre: proyecto.value.destino,
      destino: proyecto.value.destino,
      descripcion: proyecto.value.descripcion,
      presupuesto: proyecto.value.presupuesto,
      fechaInicio: proyecto.value.fechaInicio,
      fechaFin: proyecto.value.fechaFin
    });

    if (!suggestions.length) {
      initializationError.value = 'La IA no devolvió eventos válidos para inicializar el viaje.';
      return;
    }

    const projectStart = new Date(proyecto.value.fechaInicio);
    const projectEnd = new Date(proyecto.value.fechaFin);

    const eventsToCreate = suggestions.map((suggestion, index) =>
      normalizeSuggestedEvent(suggestion, index, suggestions.length, projectStart, projectEnd)
    );

    if (!eventsToCreate.length) {
      initializationError.value = 'La IA no devolvió eventos utilizables para inicializar el viaje.';
      return;
    }

    for (const event of eventsToCreate) {
      await projectService.addEventToProject(projectId, event);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    initializationError.value = `No se pudieron generar eventos iniciales: ${message}`;
  } finally {
    isInitializingTrip.value = false;
  }
};

const openCreateModal = () => {
  eventoSeleccionado.value = null;
  showEventModal.value = true;
};

const openEditModal = (evento: Evento) => {
  eventoSeleccionado.value = { ...evento };
  showEventModal.value = true;
};

const saveEvent = async (event: Evento) => {
  try {
    if (!projectId) {
      alert('ID de proyecto no válido');
      return;
    }

    if (event.id) {
      await projectService.updateEvent(projectId, event);
    } else {
      await projectService.addEventToProject(projectId, event);
    }

    showEventModal.value = false;
    eventoSeleccionado.value = null;
  } catch (e) {
    console.error('Error guardando evento:', e);
    alert('No se pudo guardar el evento');
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
        <v-progress-circular indeterminate color="indigo" />
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

            <v-btn color="indigo" rounded="xl" elevation="0" class="px-6">
              Dashboard
            </v-btn>
          </div>
        </header>

        <v-row>
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
                    <div>
                      <v-chip size="small" color="success" variant="flat">● Activo</v-chip>
                    </div>
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
                    @click="openCreateModal"
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
                    <v-timeline
                      v-if="eventos.length"
                      class="actividades-timeline"
                      side="end"
                      align="start"
                      density="compact"
                    >
                      <v-timeline-item
                        v-for="(ev, i) in eventos"
                        :key="ev.id ?? i"
                        dot-color="indigo-lighten-4"
                        size="x-small"
                        style="width: 100%;"
                      >
                        <div class="d-flex align-start w-100">
                          <div class="d-flex flex-column" style="min-width: 150px">
                            <span class="text-caption font-weight-bold text-indigo">
                              {{ formatRangoEvento(ev) }}
                            </span>
                          </div>

                          <div class="flex-grow-1 ml-4">
                            <div class="text-body-2 font-weight-bold">{{ ev.nombre }}</div>
                            <div class="text-caption text-grey">{{ ev.tipo }}</div>

                            <div
                              v-if="ev.optional"
                              class="text-caption text-orange-darken-2 font-weight-medium"
                            >
                              <v-icon size="x-small" icon="mdi-star-outline" /> Opcional
                            </div>

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
                              @click="openEditModal(ev)"
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
          </v-col>

          <v-col cols="12" md="4" class="card-container">
            <v-card class="custom-card mb-6">
              <v-card-title class="pa-6 text-subtitle-1 font-weight-bold">
                Miembros del Grupo
              </v-card-title>

              <v-card-text class="px-6 pb-6 d-flex align-center">
                <v-avatar
                  v-for="user in miembros"
                  :key="user.uid"
                  size="40"
                  class="avatar-stack"
                >
                  <v-img :src="user.urlPerfil || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'" />
                  <v-tooltip activator="parent" location="top">{{ user.nombre }}</v-tooltip>
                </v-avatar>

                <v-btn
                  icon="mdi-plus"
                  variant="tonal"
                  size="small"
                  color="grey"
                  class="ml-2"
                />
              </v-card-text>
            </v-card>

            <v-card class="custom-card card-container mb-6">
              <v-card-title class="pa-6 text-subtitle-1 font-weight-bold">
                Actividad
              </v-card-title>

              <v-list bg-color="transparent" density="compact">
                <v-list-item v-if="primerMiembro">
                  <template #prepend>
                    <v-avatar size="30">
                      <v-img :src="primerMiembro.urlPerfil" />
                    </v-avatar>
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
    @save="saveEvent"
  />

  <ShareProjectDialog
    v-model="showShareModal"
    :share-link="shareLink"
  />
</template>

<style scoped>
.dashboard-bg {
  background-color: #f0f2f5 !important;
  min-height: 100vh;
}

.card-container {
  margin: 10px 0;
}

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

.avatar-stack {
  margin-left: -12px;
  border: 3px solid white !important;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.avatar-stack:first-child {
  margin-left: 0;
}

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
