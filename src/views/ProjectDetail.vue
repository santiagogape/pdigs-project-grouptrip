<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave  } from 'vue-router';
import { projectService } from '@/services/remote/firebase/projectService';
import { auth } from '@/services/remote/firebase/config';
import type { Proyecto, Evento, Usuario } from '@/interfaces/models';
import openAIService from '@/services/remote/openAI/openAIService';

// Layout components
import NavBar from '@/components/testing/NavBar.vue';
import TheFooter from '@/components/testing/TheFooter.vue';
import EventModal from '@/components/EventModal.vue';
import ShareProjectDialog from '@/components/ShareModal.vue';
import EventsMapPanel from '@/components/EventsMapPanel.vue';
import EventSuccessDialog from '@/components/EventSuccessDialog.vue';

const route = useRoute();
const router = useRouter();
const projectId = route.params.id as string;

const showShareModal = ref(false);
const showEventSuccessModal = ref(false);
const eventSuccessMessage = ref('');
const isInitializingTrip = ref(false);
const isDeletingProject = ref(false);
const initializationError = ref('');
const actionError = ref('');
const shareLink = computed(() => `${window.location.origin}/share/${projectId}`);

// Estados reactivos
const proyecto = ref<Proyecto | null>(null);
const eventos = ref<Evento[]>([]);
const miembros = ref<Usuario[]>([]);
const loading = ref(true);
const projectHeaderStyle = computed(() => {
  const fallbackImage = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1400&auto=format&fit=crop';
  const imageUrl = (proyecto.value?.urlPortada || fallbackImage).replace(/"/g, '\\"');

  return {
    backgroundImage: `linear-gradient(115deg, rgba(15, 23, 42, 0.88), rgba(15, 118, 110, 0.58) 48%, rgba(15, 23, 42, 0.36)), url("${imageUrl}")`,
  };
});
const primerMiembro = computed(() => miembros.value[0] ?? null);
const isProjectOwner = computed(() => {
  return !!proyecto.value?.owner && auth.currentUser?.uid === proyecto.value.owner;
});
const filterMode = ref<'all' | 'day' | 'timeRangeInDay' | 'fromDay' | 'untilDay'>('all')
const filterDate = ref('')
const filterStartHour = ref('')
const filterEndHour = ref('')
const showFilterDatePicker = ref(false)
const showFilterStartTimePicker = ref(false)
const showFilterEndTimePicker = ref(false)

// Modal único para crear/editar
const showEventModal = ref(false);
const eventoSeleccionado = ref<Evento | null>(null);
const hasUnsavedEventChanges = ref(false);

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

const isTyping = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;

  return (
    el?.tagName === 'INPUT' ||
    el?.tagName === 'TEXTAREA' ||
    el?.isContentEditable === true
  );
};

const handleProjectHotkeys = (event: KeyboardEvent): void => {
  if (isTyping(event.target)) {
    return;
  }

  if (event.shiftKey && event.key.toLowerCase() === 'e') {
    event.preventDefault();

    if (!showEventModal.value) {
      openCreateModal();
    }
  }
};

onMounted(async () => {
  if (!projectId) {
    router.push('/');
    return;
  }

  window.addEventListener('keydown', handleProjectHotkeys);

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
  window.removeEventListener('keydown', handleProjectHotkeys);
  if (unsubProject) unsubProject();
  if (unsubEvents) unsubEvents();
});

// Helpers de fecha y hora
const normalizeDatePickerValue = (value: unknown): string => {
  if (!value) return ''

  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return ''

  if (typeof raw === 'string') {
    if (raw.includes('-')) return raw

    const parsed = new Date(raw)
    if (!Number.isNaN(parsed.getTime())) {
      const year = parsed.getFullYear()
      const month = String(parsed.getMonth() + 1).padStart(2, '0')
      const day = String(parsed.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    return ''
  }

  if (raw instanceof Date) {
    const year = raw.getFullYear()
    const month = String(raw.getMonth() + 1).padStart(2, '0')
    const day = String(raw.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return ''
}

const formatDateForDisplay = (value: string) => {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

const formatTimeForDisplay = (value: string) => {
  return value || ''
}

const handleFilterDateSelected = (value: unknown) => {
  const normalized = normalizeDatePickerValue(value)
  if (!normalized) return
  filterDate.value = normalized
  showFilterDatePicker.value = false
}

const handleFilterStartHourSelected = (value: string | null) => {
  if (!value) return
  filterStartHour.value = value
  showFilterStartTimePicker.value = false
}

const handleFilterEndHourSelected = (value: string | null) => {
  if (!value) return
  filterEndHour.value = value
  showFilterEndTimePicker.value = false
}

const parseInputDateToComparableNumber = (value: string) => {
  if (!value) return null
  const [year, month, day] = value.split('-')
  return Number(`${year}${month}${day}`)
}

const parseInputTimeToComparableNumber = (value: string) => {
  if (!value) return null
  const [hours, minutes] = value.split(':')
  return Number(`${hours}${minutes}`)
}

const eventIntersectsTimeRangeInDay = (
  ev: Evento,
  day: number,
  startHour: number,
  endHour: number
) => {
  if (ev.fechaInicio > day || ev.fechaFin < day) return false

  const eventStart = ev.fechaInicio === day ? ev.horaInicio : 0
  const eventEnd = ev.fechaFin === day ? ev.horaFin : 2359

  return eventStart <= endHour && eventEnd >= startHour
}

const formatDateNumberToInput = (value?: number | null) => {
  if (!value) return ''
  const str = String(value).padStart(8, '0')
  const year = str.slice(0, 4)
  const month = str.slice(4, 6)
  const day = str.slice(6, 8)
  return `${year}-${month}-${day}`
}

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
  if (!fecha) return '--/--/----'
  const str = String(fecha).padStart(8, '0')
  const year = str.slice(0, 4)
  const month = str.slice(4, 6)
  const day = str.slice(6, 8)
  return `${day}/${month}/${year}`
}

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
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear())
  return Number(`${year}${month}${day}`)
}

const dateToTimeNumber = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return Number(`${hours}${minutes}`);
};

const clampDate = (value: Date, min: Date, max: Date) => {
  return new Date(Math.min(max.getTime(), Math.max(min.getTime(), value.getTime())));
};

const activityTab = ref<'list' | 'calendar' | 'map'>('list');

const filteredEventos = computed(() => {
  const day = parseInputDateToComparableNumber(filterDate.value)
  const startHour = parseInputTimeToComparableNumber(filterStartHour.value)
  const endHour = parseInputTimeToComparableNumber(filterEndHour.value)

  return [...eventos.value]
    .filter((ev) => {
      switch (filterMode.value) {
        case 'all':
          return true

        case 'day':
          if (!day) return true
          return ev.fechaInicio <= day && ev.fechaFin >= day

        case 'timeRangeInDay':
          if (!day || startHour === null || endHour === null) return true
          if (endHour < startHour) return false
          return eventIntersectsTimeRangeInDay(ev, day, startHour, endHour)

        case 'fromDay':
          if (!day) return true
          return ev.fechaInicio >= day || ev.fechaFin >= day

        case 'untilDay':
          if (!day) return true
          return ev.fechaInicio <= day || ev.fechaFin <= day

        default:
          return true
      }
    })
    .sort(compareEventos)
})

const calendarMonthDate = ref(new Date())
const selectedCalendarDate = ref('')

const calendarMonthTitle = computed(() =>
  new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(calendarMonthDate.value)
)

const weekdayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const dateToInputString = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const calendarDayNumber = (date: Date) => parseInputDateToComparableNumber(dateToInputString(date))

const eventsForCalendarDay = (date: Date) => {
  const day = calendarDayNumber(date)
  if (!day) return []

  return filteredEventos.value.filter((ev) => ev.fechaInicio <= day && ev.fechaFin >= day)
}

const calendarDays = computed(() => {
  const year = calendarMonthDate.value.getFullYear()
  const month = calendarMonthDate.value.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const firstDayOffset = (firstOfMonth.getDay() + 6) % 7
  const gridStart = addDays(firstOfMonth, -firstDayOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index)
    const isoDate = dateToInputString(date)
    const events = eventsForCalendarDay(date)

    return {
      date,
      isoDate,
      dayLabel: date.getDate(),
      inCurrentMonth: date.getMonth() === month,
      isToday: isoDate === dateToInputString(new Date()),
      isSelected: isoDate === selectedCalendarDate.value,
      events,
    }
  })
})

const selectedCalendarEvents = computed(() => {
  if (!selectedCalendarDate.value) {
    return filteredEventos.value.slice(0, 5)
  }

  const selectedDate = new Date(`${selectedCalendarDate.value}T00:00:00`)
  return eventsForCalendarDay(selectedDate)
})

const selectedCalendarLabel = computed(() => {
  if (!selectedCalendarDate.value) return 'Próximas actividades'

  const selectedDate = new Date(`${selectedCalendarDate.value}T00:00:00`)
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(selectedDate)
})

const calendarStats = computed(() => {
  const daysWithEvents = new Set<string>()

  for (const event of filteredEventos.value) {
    const start = eventoStartDate(event)
    const end = eventoEndDate(event)

    for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
      daysWithEvents.add(dateToInputString(cursor))
    }
  }

  return {
    totalEvents: filteredEventos.value.length,
    daysWithEvents: daysWithEvents.size,
  }
})

const previousCalendarMonth = () => {
  calendarMonthDate.value = new Date(
    calendarMonthDate.value.getFullYear(),
    calendarMonthDate.value.getMonth() - 1,
    1
  )
}

const nextCalendarMonth = () => {
  calendarMonthDate.value = new Date(
    calendarMonthDate.value.getFullYear(),
    calendarMonthDate.value.getMonth() + 1,
    1
  )
}

const goToCurrentCalendarMonth = () => {
  const today = new Date()
  calendarMonthDate.value = new Date(today.getFullYear(), today.getMonth(), 1)
  selectedCalendarDate.value = dateToInputString(today)
}

const selectCalendarDay = (isoDate: string) => {
  selectedCalendarDate.value = isoDate
}

const mapEvents = computed(() => {
  return [...filteredEventos.value]
    .filter((ev) => ev.lat != null && ev.lng != null)
})

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
    gastos: [],
    descripcion: null as string | null,
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
    gastos: [],
    descripcion: null as string | null
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
  if (showEventModal.value) {
    return;
  }

  eventoSeleccionado.value = null;
  hasUnsavedEventChanges.value = false;
  showEventModal.value = true;
};

const openEditModal = (evento: Evento) => {
  if (showEventModal.value) {
    return;
  }

  eventoSeleccionado.value = { ...evento };
  hasUnsavedEventChanges.value = false;
  showEventModal.value = true;
};

const handleEventDirtyChange = (value: boolean): void => {
  hasUnsavedEventChanges.value = value;
};

const confirmDiscardEventChanges = (): boolean => {
  if (!showEventModal.value || !hasUnsavedEventChanges.value) {
    return true;
  }

  return window.confirm(
    'Tienes cambios sin guardar en el evento. ¿Seguro que quieres salir?'
  );
};

const closeEventModal = (): void => {
  if (!confirmDiscardEventChanges()) {
    return;
  }

  showEventModal.value = false;
  eventoSeleccionado.value = null;
  hasUnsavedEventChanges.value = false;
};

const saveEvent = async (event: Evento) => {
  try {
    if (!projectId) {
      alert('ID de proyecto no válido');
      return;
    }

    const isEditing = !!event.id;

    if (isEditing) {
      await projectService.updateEvent(projectId, event);
    } else {
      await projectService.addEventToProject(projectId, event);
    }

    hasUnsavedEventChanges.value = false;
    showEventModal.value = false;
    eventoSeleccionado.value = null;

    eventSuccessMessage.value = isEditing
      ? 'Evento actualizado correctamente.'
      : 'Evento creado correctamente.';

    showEventSuccessModal.value = true;
  } catch (e) {
    console.error('Error guardando evento:', e);
    alert('No se pudo guardar el evento');
  }
};

const deleteEvent = async (event: Evento) => {
  if (!confirm(`¿Eliminar evento "${event.nombre}"?`)) return;

  try {
    actionError.value = '';
    if (!projectId || !event.id) {
      actionError.value = 'ID de proyecto o evento no válido.';
      return;
    }
    await projectService.deleteEvent(projectId, event.id);
  } catch (e) {
    console.error('Error eliminando evento:', e);
    actionError.value = 'No se pudo eliminar el evento.';
  }
};

const deleteProject = async () => {
  if (!proyecto.value || !isProjectOwner.value || isDeletingProject.value) return;

  const confirmed = window.confirm(
    `¿Eliminar el proyecto "${proyecto.value.destino}"? Esta acción borrará el viaje, sus eventos y el acceso de todos los miembros.`
  );

  if (!confirmed) return;

  try {
    actionError.value = '';
    isDeletingProject.value = true;

    if (unsubProject) {
      unsubProject();
      unsubProject = undefined;
    }

    if (unsubEvents) {
      unsubEvents();
      unsubEvents = undefined;
    }

    await projectService.removeProject(projectId);
    router.push({ name: 'Dashboard' });
  } catch (error) {
    console.error('Error eliminando proyecto:', error);
    actionError.value = 'No se pudo eliminar el proyecto.';
  } finally {
    isDeletingProject.value = false;
  }
};

onBeforeRouteLeave(() => {
  return confirmDiscardEventChanges();
});


</script>

<template>
  <v-app>
    <NavBar />

    <v-main class="gt-page project-page">
      <v-container v-if="loading" class="fill-height justify-center">
        <v-progress-circular indeterminate color="red-darken-3" />
      </v-container>

      <v-container v-else-if="proyecto" class="py-10 project-wrap">
        <header class="project-header" :style="projectHeaderStyle">
          <div class="project-header-copy">
            <p class="gt-kicker project-kicker">Itinerario compartido</p>
            <h1 class="gt-title">{{ proyecto.destino }}</h1>
            <p class="gt-muted project-description">{{ proyecto.descripcion }}</p>
          </div>

          <div class="project-header-actions">
            <v-btn
              class="gt-secondary-btn"
              prepend-icon="mdi-export-variant"
              variant="outlined"
              color="red-darken-3"
              @click="showShareModal = true"
            >
              Compartir
            </v-btn>

            <v-btn color="red-darken-3" class="gt-primary-btn" to="/dashboard" elevation="0" prepend-icon="mdi-view-dashboard-outline">
              Panel
            </v-btn>

            <v-btn
              v-if="isProjectOwner"
              class="delete-project-btn"
              color="error"
              prepend-icon="mdi-delete-outline"
              :loading="isDeletingProject"
              @click="deleteProject"
            >
              Eliminar proyecto
            </v-btn>
          </div>
        </header>

        <v-row class="project-content-row" justify="center">
          <v-col cols="12" md="10" lg="8" class="card-container itinerary-column">
            <v-card class="gt-card mb-6">
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
                      <v-chip size="small" color="success" variant="tonal" prepend-icon="mdi-circle-medium">Activo</v-chip>
                    </div>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <v-card class="gt-card card-container mb-6">
              <v-card-title class="pa-6 font-weight-bold activities-title">
                <span>Actividades</span>

                <div class="d-flex ga-2">
                  <v-btn
                    color="red-darken-3"
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
                    color="red-darken-3"
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

              <v-card-text v-if="actionError" class="px-6 pb-0">
                <v-alert type="error" variant="tonal" density="compact">
                  {{ actionError }}
                </v-alert>
              </v-card-text>

              <v-card-text class="pa-6 pt-0">
                <div class="mb-4 filter-grid">
                  <div class="filter-grid-main">
                    <div class="filter-grid-item">
                      <v-select
                        v-model="filterMode"
                        label="Filtro"
                        variant="outlined"
                        rounded="xl"
                        :items="[
                          { title: 'Todos', value: 'all' },
                          { title: 'Eventos de un día', value: 'day' },
                          { title: 'Rango de horas en un día', value: 'timeRangeInDay' },
                          { title: 'A partir de un día', value: 'fromDay' },
                          { title: 'Antes de un día', value: 'untilDay' }
                        ]"
                      />
                    </div>

                    <div
                      v-if="filterMode !== 'all'"
                      class="filter-grid-item"
                    >
                      <v-menu
                        v-model="showFilterDatePicker"
                        :close-on-content-click="false"
                        location="bottom"
                      >
                        <template #activator="{ props: menuProps }">
                          <v-text-field
                            v-bind="menuProps"
                            :model-value="formatDateForDisplay(filterDate)"
                            label="Fecha"
                            variant="outlined"
                            rounded="xl"
                            readonly
                            append-inner-icon="mdi-calendar"
                          />
                        </template>

                        <v-date-picker
                          :model-value="filterDate"
                          @update:model-value="handleFilterDateSelected"
                        />
                      </v-menu>
                    </div>

                    <template v-if="filterMode === 'timeRangeInDay'">
                      <div class="filter-grid-item">
                        <v-menu
                          v-model="showFilterStartTimePicker"
                          :close-on-content-click="false"
                          location="bottom"
                        >
                          <template #activator="{ props: menuProps }">
                            <v-text-field
                              v-bind="menuProps"
                              :model-value="formatTimeForDisplay(filterStartHour)"
                              label="Desde"
                              variant="outlined"
                              rounded="xl"
                              readonly
                              append-inner-icon="mdi-clock-outline"
                            />
                          </template>

                          <v-time-picker
                            :model-value="filterStartHour"
                            format="24hr"
                            @update:model-value="handleFilterStartHourSelected"
                          />
                        </v-menu>
                      </div>

                      <div class="filter-grid-item">
                        <v-menu
                          v-model="showFilterEndTimePicker"
                          :close-on-content-click="false"
                          location="bottom"
                        >
                          <template #activator="{ props: menuProps }">
                            <v-text-field
                              v-bind="menuProps"
                              :model-value="formatTimeForDisplay(filterEndHour)"
                              label="Hasta"
                              variant="outlined"
                              rounded="xl"
                              readonly
                              append-inner-icon="mdi-clock-outline"
                            />
                          </template>

                          <v-time-picker
                            :model-value="filterEndHour"
                            format="24hr"
                            @update:model-value="handleFilterEndHourSelected"
                          />
                        </v-menu>
                      </div>
                    </template>
                  </div>

                  <div class="filter-actions">
                    <v-btn
                      variant="outlined"
                      rounded="xl"
                      @click="
                        filterMode = 'all';
                        filterDate = '';
                        filterStartHour = '';
                        filterEndHour = '';
                      "
                    >
                      Limpiar
                    </v-btn>
                  </div>
                </div>
                <v-tabs v-model="activityTab" color="red-darken-3" grow>
                  <v-tab value="list" prepend-icon="mdi-format-list-bulleted">Lista</v-tab>
                  <v-tab value="calendar" prepend-icon="mdi-calendar-month-outline">Calendario</v-tab>
                  <v-tab value="map" prepend-icon="mdi-map-outline">Mapa</v-tab>
                </v-tabs>

                <v-window v-model="activityTab" class="mt-4">
                  <v-window-item value="list">
                    <v-timeline
                      v-if="filteredEventos.length"
                      class="actividades-timeline"
                      side="end"
                      align="start"
                      density="compact"
                    >
                      <v-timeline-item
                        v-for="(ev, i) in filteredEventos"
                        :key="ev.id ?? i"
                        dot-color="orange-lighten-4"
                        size="x-small"
                        style="width: 100%;"
                      >
                        <div class="evento-item">
                          <div class="evento-main">
                            <div class="evento-fecha text-caption font-weight-bold text-red-darken-3">
                              {{ formatRangoEvento(ev) }}
                            </div>

                            <div class="evento-contenido">
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
                              <div class="text-caption text-grey-darken-1">
                                <v-icon size="x-small" icon="mdi-text" />
                                {{ ev.descripcion || 'No hay descripción' }}
                              </div>
                            </div>
                          </div>

                          <div class="evento-actions">
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

                    <div v-else class="empty-inline">
                      <v-icon icon="mdi-calendar-blank-outline" size="42" />
                      No hay actividades programadas
                    </div>
                  </v-window-item>

                  <v-window-item value="calendar">
                    <div v-if="filteredEventos.length" class="calendar-view">
                      <div class="calendar-toolbar">
                        <div>
                          <p class="gt-kicker mb-1">Calendario</p>
                          <h3>{{ calendarMonthTitle }}</h3>
                        </div>

                        <div class="calendar-toolbar-actions">
                          <v-btn
                            icon="mdi-chevron-left"
                            variant="tonal"
                            color="red-darken-3"
                            size="small"
                            aria-label="Mes anterior"
                            @click="previousCalendarMonth"
                          />
                          <v-btn
                            class="gt-secondary-btn"
                            variant="outlined"
                            color="red-darken-3"
                            size="small"
                            @click="goToCurrentCalendarMonth"
                          >
                            Hoy
                          </v-btn>
                          <v-btn
                            icon="mdi-chevron-right"
                            variant="tonal"
                            color="red-darken-3"
                            size="small"
                            aria-label="Mes siguiente"
                            @click="nextCalendarMonth"
                          />
                        </div>
                      </div>

                      <div class="calendar-summary">
                        <div>
                          <span>{{ calendarStats.totalEvents }}</span>
                          <small>actividades filtradas</small>
                        </div>
                        <div>
                          <span>{{ calendarStats.daysWithEvents }}</span>
                          <small>días con planes</small>
                        </div>
                      </div>

                      <div class="calendar-layout">
                        <section class="calendar-month" aria-label="Calendario mensual">
                          <div
                            v-for="label in weekdayLabels"
                            :key="label"
                            class="calendar-weekday"
                          >
                            {{ label }}
                          </div>

                          <button
                            v-for="day in calendarDays"
                            :key="day.isoDate"
                            type="button"
                            :class="[
                              'calendar-day',
                              {
                                'calendar-day-muted': !day.inCurrentMonth,
                                'calendar-day-today': day.isToday,
                                'calendar-day-selected': day.isSelected,
                                'calendar-day-has-events': day.events.length > 0
                              }
                            ]"
                            @click="selectCalendarDay(day.isoDate)"
                          >
                            <span class="calendar-day-number">{{ day.dayLabel }}</span>
                            <span v-if="day.events.length" class="calendar-event-count">
                              {{ day.events.length }}
                            </span>
                            <span class="calendar-event-list">
                              <span
                                v-for="event in day.events.slice(0, 2)"
                                :key="`${day.isoDate}-${event.id ?? event.nombre}`"
                                class="calendar-event-pill"
                              >
                                {{ formatHora(event.horaInicio) }} {{ event.nombre }}
                              </span>
                            </span>
                          </button>
                        </section>

                        <aside class="calendar-agenda">
                          <h4>{{ selectedCalendarLabel }}</h4>

                          <div v-if="selectedCalendarEvents.length" class="calendar-agenda-list">
                            <article
                              v-for="event in selectedCalendarEvents"
                              :key="event.id ?? `${event.nombre}-${event.fechaInicio}-${event.horaInicio}`"
                              class="calendar-agenda-item"
                            >
                              <div class="agenda-time">
                                {{ formatHora(event.horaInicio) }}
                              </div>

                              <div class="agenda-copy">
                                <strong>{{ event.nombre }}</strong>
                                <span>{{ formatRangoEvento(event) }}</span>
                                <small v-if="event.lugar">
                                  <v-icon icon="mdi-map-marker" size="x-small" />
                                  {{ event.lugar }}
                                </small>
                              </div>

                              <v-btn
                                icon="mdi-pencil"
                                variant="text"
                                color="red-darken-3"
                                size="small"
                                aria-label="Editar actividad"
                                @click="openEditModal(event)"
                              />
                            </article>
                          </div>

                          <div v-else class="calendar-agenda-empty">
                            <v-icon icon="mdi-calendar-blank-outline" />
                            Sin actividades este día
                          </div>
                        </aside>
                      </div>
                    </div>

                    <div v-else class="empty-inline">
                      <v-icon icon="mdi-calendar-remove-outline" size="42" />
                      No hay actividades para mostrar en el calendario
                    </div>
                  </v-window-item>

                  <v-window-item value="map">
                    <div v-if="mapEvents.length" class="mt-2">
                      <EventsMapPanel :events="mapEvents" />
                    </div>

                    <div v-else class="empty-inline">
                      <v-icon icon="mdi-map-marker-off-outline" size="42" />
                      No hay actividades con coordenadas para mostrar en el mapa
                    </div>
                  </v-window-item>
                </v-window>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="10" lg="4" class="card-container side-column">
            <v-card class="gt-card mb-6">
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

            <v-card class="gt-card card-container mb-6">
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
  @close="closeEventModal"
  @save="saveEvent"
  @changes="handleEventDirtyChange"
  />
  <EventSuccessDialog
  :is-open="showEventSuccessModal"
  :message="eventSuccessMessage"
  :duration="1200"
  @close="showEventSuccessModal = false"
  />
  <ShareProjectDialog
    v-model="showShareModal"
    :share-link="shareLink"
  />
</template>

<style scoped>

.evento-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  width: 100%;
}

.evento-main {
  flex: 1 1 auto;
  min-width: 0;
}

.evento-fecha {
  margin-bottom: 6px;
}

.evento-contenido {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.evento-actions {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  flex-shrink: 0;
}

.filter-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-grid-main {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.filter-grid-item {
  min-width: 0;
}

.filter-actions {
  display: flex;
  justify-content: flex-start;
}

@media (max-width: 700px) {
  .filter-grid-main {
    grid-template-columns: 1fr;
  }
}

.project-wrap {
  /* width: min(1180px, calc(100% - 24px)); */
}

.project-header {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: clamp(1.5rem, 6vw, 5rem);
  min-height: clamp(320px, 42vw, 520px);
  margin: 0 auto 2rem;
  max-width: 1120px;
  overflow: hidden;
  padding: clamp(1.5rem, 5vw, 3rem);
  border: 1px solid rgba(255, 255, 255, 0.32);
  border-radius: 32px;
  background-position: center;
  background-size: cover;
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.24);
  isolation: isolate;
}

.project-header::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(circle at 16% 18%, rgba(255, 255, 255, 0.16), transparent 30%),
    linear-gradient(180deg, transparent 40%, rgba(15, 23, 42, 0.38));
}

.project-header-copy {
  max-width: 680px;
}

.project-header h1 {
  margin: 0.15rem 0 0.75rem;
  color: #ffffff;
  font-size: clamp(2.3rem, 6vw, 4.2rem);
  text-shadow: 0 12px 32px rgba(15, 23, 42, 0.55);
}

.project-kicker {
  display: inline-flex;
  width: fit-content;
  padding: 0.45rem 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  color: #ffffff !important;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(10px);
}

.project-description {
  max-width: 620px;
  color: rgba(255, 255, 255, 0.88) !important;
  font-size: clamp(1rem, 2vw, 1.2rem);
  line-height: 1.6;
}

.project-header-actions,
.activities-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.project-header-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.project-header-actions .v-btn {
  border-color: rgba(255, 255, 255, 0.72) !important;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.22) !important;
}

.project-header-actions .gt-secondary-btn {
  color: #ffffff !important;
  background: rgba(255, 255, 255, 0.12) !important;
  backdrop-filter: blur(10px);
}

.project-header-actions .gt-primary-btn {
  background: #ffffff !important;
  color: var(--gt-primary-dark) !important;
}

.delete-project-btn {
  border-radius: 999px !important;
  font-weight: 800 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
}

.project-content-row {
  max-width: 1120px;
  margin-inline: auto;
}

.itinerary-column {
  display: flex;
  flex-direction: column;
}

.itinerary-column > .gt-card {
  width: 100%;
}

.card-container {
  margin: 10px 0;
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

.empty-inline {
  min-height: 160px;
  display: grid;
  place-items: center;
  gap: 0.75rem;
  color: var(--gt-muted);
  text-align: center;
}

.calendar-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}

.calendar-toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.calendar-toolbar h3 {
  color: var(--gt-text);
  font-size: clamp(1.35rem, 3vw, 2rem);
  font-weight: 850;
  line-height: 1.1;
  text-transform: capitalize;
}

.calendar-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.calendar-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.calendar-summary div {
  padding: 14px 16px;
  border: 1px solid rgba(185, 28, 28, 0.16);
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(250, 204, 21, 0.18), rgba(249, 115, 22, 0.08));
}

.calendar-summary span {
  display: block;
  color: var(--gt-primary-dark);
  font-size: 1.5rem;
  font-weight: 900;
  line-height: 1;
}

.calendar-summary small {
  color: var(--gt-muted);
  font-weight: 700;
}

.calendar-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 16px;
  align-items: stretch;
}

.calendar-month {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
}

.calendar-weekday {
  color: var(--gt-muted);
  font-size: 0.78rem;
  font-weight: 850;
  letter-spacing: 0.05em;
  text-align: center;
  text-transform: uppercase;
}

.calendar-day {
  position: relative;
  min-height: 116px;
  padding: 10px;
  border: 1px solid rgba(185, 28, 28, 0.12);
  border-radius: 16px;
  background: #fffaf3;
  color: var(--gt-text);
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.calendar-day:hover {
  border-color: rgba(220, 38, 38, 0.34);
  box-shadow: 0 10px 24px rgba(185, 28, 28, 0.1);
  transform: translateY(-2px);
}

.calendar-day-muted {
  opacity: 0.48;
}

.calendar-day-today {
  border-color: rgba(249, 115, 22, 0.7);
  background: #fff7dc;
}

.calendar-day-selected {
  border-color: var(--gt-primary);
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
}

.calendar-day-has-events {
  background: #fff7ed;
}

.calendar-day-number {
  color: var(--gt-text);
  font-weight: 850;
}

.calendar-event-count {
  position: absolute;
  top: 8px;
  right: 8px;
  min-width: 22px;
  height: 22px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  background: var(--gt-primary);
  color: white;
  font-size: 0.75rem;
  font-weight: 850;
}

.calendar-event-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 10px;
}

.calendar-event-pill {
  overflow: hidden;
  max-width: 100%;
  padding: 3px 7px;
  border-radius: 999px;
  background: rgba(249, 115, 22, 0.15);
  color: #7c2d12;
  font-size: 0.72rem;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.calendar-agenda {
  min-height: 100%;
  padding: 18px;
  border: 1px solid rgba(185, 28, 28, 0.14);
  border-radius: 18px;
  background: #ffffff;
}

.calendar-agenda h4 {
  margin-bottom: 14px;
  color: var(--gt-text);
  font-size: 1.05rem;
  font-weight: 850;
  text-transform: capitalize;
}

.calendar-agenda-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.calendar-agenda-item {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: flex-start;
  padding: 12px;
  border-radius: 14px;
  background: #fff7ed;
}

.agenda-time {
  color: var(--gt-primary-dark);
  font-size: 0.85rem;
  font-weight: 900;
}

.agenda-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.agenda-copy strong {
  overflow: hidden;
  color: var(--gt-text);
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agenda-copy span,
.agenda-copy small {
  color: var(--gt-muted);
  font-size: 0.78rem;
}

.calendar-agenda-empty {
  min-height: 160px;
  display: grid;
  place-items: center;
  gap: 8px;
  color: var(--gt-muted);
  text-align: center;
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

.actividades-timeline {
  max-width: 760px;
  margin-inline: auto;
  padding-inline: 8px;
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

@media (max-width: 760px) {
  .project-header,
  .activities-title {
    align-items: flex-start;
    flex-direction: column;
  }

  .project-header-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .project-header-actions .v-btn {
    flex: 1 1 180px;
  }

  .actividades-timeline {
    max-width: 100%;
    padding-inline: 0;
  }

  .calendar-toolbar,
  .calendar-layout {
    grid-template-columns: 1fr;
  }

  .calendar-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .calendar-summary {
    grid-template-columns: 1fr;
  }

  .calendar-month {
    gap: 5px;
  }

  .calendar-day {
    min-height: 78px;
    padding: 8px;
    border-radius: 12px;
  }

  .calendar-event-pill {
    display: none;
  }

  .custom-card :deep(.v-field__input) {
  padding-left: 15px;
}

.custom-card :deep(.v-field__append-inner) {
  padding-right: 12px;
}

.custom-card :deep(.v-row--density-default) {
    --v-col-gap-x: 24px;
    --v-col-gap-y: 2%;
}
}
</style>
