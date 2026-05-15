<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import type { Evento } from '@/interfaces/models';
import LocationPicker from '@/components/LocationPicker.vue';

const props = defineProps<{
  visible: boolean;
  evento: Evento | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', evento: Evento): void;
  (e: 'changes', value: boolean): void;
}>();

const showFechaInicioPicker = ref(false);
const showFechaFinPicker = ref(false);

const internalVisible = computed({
  get: () => props.visible,
  set: (val) => {
    if (!val) emit('close');
  }
});

const formRef = ref();
const isFormValid = ref(false);
const showLocationPicker = ref(false);
const hasTriedSubmit = ref(false);

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

const formatDateForDisplay = (value: unknown) => {
  const normalized = normalizeDatePickerValue(value)
  if (!normalized) return ''

  const [year, month, day] = normalized.split('-')
  return `${day}/${month}/${year}`
}

const handleFechaInicioSelected = (value: string | null) => {
  if (!value) return;

  eventForm.value.fechaInicio = value;

  if (!eventForm.value.isMultiDay) {
    eventForm.value.fechaFin = value;
  } else if (!eventForm.value.fechaFin || eventForm.value.fechaFin < value) {
    eventForm.value.fechaFin = value;
  }

  showFechaInicioPicker.value = false;
};

const handleFechaFinSelected = (value: string | null) => {
  if (!value) return;

  eventForm.value.fechaFin = value;
  showFechaFinPicker.value = false;
};

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

const parseDateInputToNumber = (value: unknown) => {
  const normalized = normalizeDatePickerValue(value)
  if (!normalized) {
    throw new Error('Fecha inválida')
  }

  const [year, month, day] = normalized.split('-')
  return Number(`${year}${month}${day}`)
}

const parseTimeInputToNumber = (value: string) => {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    throw new Error('Hora inválida');
  }

  const [hours, minutes] = value.split(':');
  return Number(`${hours}${minutes}`);
};

const isEndDateAfterOrEqualStartDate = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) return false
  return endDate >= startDate
}

const buildDefaultForm = () => ({
  id: undefined as string | undefined,
  nombre: '',
  tipo: '',
  fechaInicio: '',
  fechaFin: '',
  horaInicio: '',
  horaFin: '',
  precio: null as number | null,
  lugar: '',
  lat: null as number | null,
  lng: null as number | null,
  optional: false,
  isMultiDay: false,
  descripcion: null as string | null,
});

const mapEventoToForm = (ev: Evento | null) => {
  if (!ev) return buildDefaultForm();

  const fechaInicio = formatDateNumberToInput(ev.fechaInicio);
  const fechaFin = formatDateNumberToInput(ev.fechaFin);

  return {
    id: ev.id,
    nombre: ev.nombre ?? '',
    tipo: ev.tipo ?? '',
    fechaInicio,
    fechaFin,
    horaInicio: formatTimeNumberToInput(ev.horaInicio),
    horaFin: formatTimeNumberToInput(ev.horaFin),
    precio: ev.precio ?? null,
    lugar: ev.lugar ?? '',
    lat: ev.lat ?? null,
    lng: ev.lng ?? null,
    optional: ev.optional ?? false,
    isMultiDay: !!(ev.fechaFin && ev.fechaInicio && ev.fechaFin !== ev.fechaInicio),
    descripcion: ev.descripcion ?? null,
  };
};

const eventForm = ref(mapEventoToForm(props.evento));


const hasUnsavedChanges = ref(false);
const ignoreDirtyTracking = ref(false);

const markAsDirty = (): void => {
  if (!props.visible || ignoreDirtyTracking.value || hasUnsavedChanges.value) {
    return;
  }

  hasUnsavedChanges.value = true;
  emit('changes', true);
};

const resetDirtyState = (): void => {
  hasUnsavedChanges.value = false;
  emit('changes', false);
};

const setFormWithoutDirty = async (value: ReturnType<typeof mapEventoToForm>): Promise<void> => {
  ignoreDirtyTracking.value = true;
  eventForm.value = value;
  resetDirtyState();

  await nextTick();

  ignoreDirtyTracking.value = false;
};

watch(
  () => props.evento,
  async (ev) => {
    await setFormWithoutDirty(mapEventoToForm(ev));
  },
  { immediate: true }
);

watch(
  () => props.visible,
  async (visible) => {
    if (visible) {
      hasTriedSubmit.value = false;
      await setFormWithoutDirty(mapEventoToForm(props.evento));
      return;
    }

    hasTriedSubmit.value = false;
    resetDirtyState();
  }
);

watch(
  () => eventForm.value.isMultiDay,
  (isMultiDay) => {
    if (!isMultiDay) {
      eventForm.value.fechaFin = eventForm.value.fechaInicio;
    } else if (!eventForm.value.fechaFin) {
      eventForm.value.fechaFin = eventForm.value.fechaInicio;
    }
  }
);

watch(
  () => eventForm.value.fechaInicio,
  (fechaInicio) => {
    if (!eventForm.value.isMultiDay) {
      eventForm.value.fechaFin = fechaInicio;
      return;
    }

    if (eventForm.value.fechaFin && eventForm.value.fechaFin < fechaInicio) {
      eventForm.value.fechaFin = fechaInicio;
    }
  }
);

watch(
  eventForm,
  () => {
    markAsDirty();
  },
  { deep: true }
);

const dialogTitle = computed(() =>
  props.evento ? 'Editar actividad' : 'Crear evento'
);

const dialogSubtitle = computed(() =>
  props.evento
    ? 'Ajusta los detalles del evento'
    : 'Completa la información para añadir una nueva actividad'
);

const rules = {
  required: (v: any) => !!v || 'Campo obligatorio',

  timeFormat: (v: string) =>
    /^\d{2}:\d{2}$/.test(v) || 'Introduce una hora válida',

  minLength: (min: number) => (v: string) =>
    (v && v.length >= min) || `Mínimo ${min} caracteres`,

  precio: (v: number | null) =>
    (v === null || v === undefined || v >= 0) || 'El precio no puede ser negativo',

  fechaFinValida: () => {
    if (!eventForm.value.isMultiDay) return true;
    if (!eventForm.value.fechaInicio || !eventForm.value.fechaFin) return 'Campo obligatorio';

    return (
      isEndDateAfterOrEqualStartDate(eventForm.value.fechaInicio, eventForm.value.fechaFin) ||
      'La fecha de fin debe ser igual o posterior a la fecha de inicio'
    );
  },

  horaFinValida: () => {
    if (!eventForm.value.horaInicio || !eventForm.value.horaFin) return true;

    if (eventForm.value.isMultiDay && eventForm.value.fechaInicio && eventForm.value.fechaFin) {
      const sameDay = eventForm.value.fechaInicio === eventForm.value.fechaFin;
      if (!sameDay) return true;
    }

    return eventForm.value.horaFin > eventForm.value.horaInicio ||
      'La hora de fin debe ser posterior a la hora de inicio';
  }
};

const validationIssues = computed(() => {
  const issues: string[] = [];

  if (!eventForm.value.lugar) issues.push('seleccionar un lugar');
  if (!eventForm.value.fechaInicio) issues.push('elegir la fecha de inicio');
  if (eventForm.value.isMultiDay && !eventForm.value.fechaFin) issues.push('elegir la fecha de fin');
  if (!eventForm.value.horaInicio) issues.push('indicar la hora de inicio');
  if (!eventForm.value.horaFin) issues.push('indicar la hora de fin');

  if (!eventForm.value.nombre) {
    issues.push('escribir el nombre del evento');
  } else if (eventForm.value.nombre.length < 3) {
    issues.push('usar un nombre de al menos 3 caracteres');
  }

  if (!eventForm.value.tipo) issues.push('seleccionar un tipo');

  if (
    eventForm.value.precio !== null &&
    eventForm.value.precio !== undefined &&
    eventForm.value.precio < 0
  ) {
    issues.push('corregir el precio para que no sea negativo');
  }

  if (
    eventForm.value.isMultiDay &&
    eventForm.value.fechaInicio &&
    eventForm.value.fechaFin &&
    eventForm.value.fechaFin < eventForm.value.fechaInicio
  ) {
    issues.push('poner una fecha de fin igual o posterior a la de inicio');
  }

  if (
    eventForm.value.horaInicio &&
    eventForm.value.horaFin &&
    (!eventForm.value.isMultiDay || eventForm.value.fechaInicio === eventForm.value.fechaFin) &&
    eventForm.value.horaFin <= eventForm.value.horaInicio
  ) {
    issues.push('poner una hora de fin posterior a la de inicio');
  }

  return issues;
});

const validationMessage = computed(() => {
  if (!validationIssues.value.length) return '';
  return `Falta completar o corregir: ${validationIssues.value.join(', ')}.`;
});

const convertFormToEvent = (form: typeof eventForm.value): Evento => {
  const fechaFin = form.isMultiDay ? form.fechaFin : form.fechaInicio;

  return {
    id: form.id,
    nombre: form.nombre,
    tipo: form.tipo,
    fechaInicio: parseDateInputToNumber(form.fechaInicio),
    fechaFin: parseDateInputToNumber(fechaFin),
    horaInicio: parseTimeInputToNumber(form.horaInicio),
    horaFin: parseTimeInputToNumber(form.horaFin),
    precio: form.precio ?? null,
    lugar: form.lugar || null,
    lat: form.lat ?? null,
    lng: form.lng ?? null,
    optional: form.optional ?? false,
    gastos: props.evento?.gastos ?? [],
    descripcion: form.descripcion?.trim() || null,
  };
};

const close = () => emit('close');

const handleSave = async () => {
  hasTriedSubmit.value = true;
  const valid = await formRef.value.validate();
  if (!valid.valid) return;

  emit('save', convertFormToEvent(eventForm.value));
};

const handleLocationConfirm = (location: { lat: number; lng: number; name?: string }) => {
  eventForm.value.lugar = location.name || '';
  eventForm.value.lat = location.lat;
  eventForm.value.lng = location.lng;
  showLocationPicker.value = false;
};
</script>

<template>
  <v-dialog v-model="internalVisible" max-width="640" transition="dialog-bottom-transition">
    <v-card class="custom-card">
      <v-card-item class="pa-6 pb-2">
        <template #prepend>
          <v-icon
            :icon="props.evento ? 'mdi-calendar-edit' : 'mdi-calendar-plus'"
            color="red-darken-3"
            size="large"
            class="me-3"
          />
        </template>

        <v-card-title class="text-h5 font-weight-bold color-navy">
          {{ dialogTitle }}
        </v-card-title>

        <v-card-subtitle class="text-grey-darken-1">
          {{ dialogSubtitle }}
        </v-card-subtitle>
      </v-card-item>

      <v-card-text class="px-6 pb-2">
        <v-form ref="formRef" v-model="isFormValid">
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="eventForm.lugar"
                label="Lugar"
                :rules="[rules.required]"
                variant="outlined"
                rounded="xl"
                append-inner-icon="mdi-map-marker"
                @click:append-inner="showLocationPicker = true"
              />
            </v-col>

            <v-col cols="12" :md="eventForm.isMultiDay ? 6 : 12">
              <v-menu
                v-model="showFechaInicioPicker"
                :close-on-content-click="false"
                location="bottom"
              >
                <template #activator="{ props: menuProps }">
                  <v-text-field
                    v-bind="menuProps"
                    :model-value="formatDateForDisplay(eventForm.fechaInicio)"
                    label="Fecha de inicio"
                    :rules="[rules.required]"
                    variant="outlined"
                    rounded="xl"
                    readonly
                    append-inner-icon="mdi-calendar"
                  />
                </template>

                <v-date-picker
                  :model-value="eventForm.fechaInicio"
                  @update:model-value="handleFechaInicioSelected"
                />
              </v-menu>
            </v-col>

            <v-col v-if="eventForm.isMultiDay" cols="12" md="6">
              <v-menu
                v-model="showFechaFinPicker"
                :close-on-content-click="false"
                location="bottom"
              >
                <template #activator="{ props: menuProps }">
                  <v-text-field
                    v-bind="menuProps"
                    :model-value="formatDateForDisplay(eventForm.fechaFin)"
                    label="Fecha de fin"
                    :rules="[rules.required, rules.fechaFinValida]"
                    variant="outlined"
                    rounded="xl"
                    readonly
                    append-inner-icon="mdi-calendar"
                  />
                </template>

                <v-date-picker
                  :model-value="eventForm.fechaFin"
                  :min="eventForm.fechaInicio || undefined"
                  @update:model-value="handleFechaFinSelected"
                />
              </v-menu>
            </v-col>

            <v-col cols="12">
              <v-checkbox
                v-model="eventForm.isMultiDay"
                label="Este evento dura más de un día"
                color="red-darken-3"
                density="comfortable"
                hide-details
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="eventForm.horaInicio"
                type="time"
                label="Hora inicio"
                :rules="[rules.required, rules.timeFormat]"
                variant="outlined"
                rounded="xl"
                prepend-inner-icon="mdi-clock-outline"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="eventForm.horaFin"
                type="time"
                label="Hora fin"
                :rules="[rules.required, rules.timeFormat, rules.horaFinValida]"
                variant="outlined"
                rounded="xl"
                prepend-inner-icon="mdi-clock-outline"
              />
            </v-col>

            <v-col cols="12">
              <v-text-field
                v-model="eventForm.nombre"
                label="Nombre del evento"
                :rules="[rules.required, rules.minLength(3)]"
                variant="outlined"
                rounded="xl"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-select
                v-model="eventForm.tipo"
                :items="['Gastronomía', 'Transporte', 'Actividad', 'Alojamiento']"
                label="Tipo"
                :rules="[rules.required]"
                variant="outlined"
                rounded="xl"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="eventForm.precio"
                label="Precio (€)"
                type="number"
                min="0"
                :rules="[rules.precio]"
                variant="outlined"
                rounded="xl"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="eventForm.descripcion"
                label="Descripción"
                variant="outlined"
                rounded="xl"
                rows="3"
                auto-grow
                clearable
              />
            </v-col>
            <v-col cols="12">
              <v-checkbox
                v-model="eventForm.optional"
                label="Evento opcional"
                color="red-darken-3"
                density="comfortable"
                hide-details
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-card-actions class="px-6 pb-6">
        <div
          v-if="hasTriedSubmit && validationMessage"
          class="validation-feedback"
          role="alert"
          aria-live="polite"
        >
          {{ validationMessage }}
        </div>

        <v-spacer />

        <v-btn
          variant="outlined"
          rounded="xl"
          @click="close"
        >
          Cancelar
        </v-btn>

        <v-btn
          color="red-darken-3"
          rounded="xl"
          elevation="0"
          @click="handleSave"
        >
          {{ props.evento ? 'Guardar cambios' : 'Guardar evento' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <LocationPicker
    :isOpen="showLocationPicker"
    @close="showLocationPicker = false"
    @confirm="handleLocationConfirm"
  />
</template>

<style scoped>
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

.validation-feedback {
  flex: 1 1 auto;
  margin-right: 16px;
  color: #b91c1c;
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.4;
}
.custom-card :deep(.v-field__input) {
  padding-left: 18px;
}

.custom-card :deep(.v-field__append-inner) {
  padding-right: 12px;
}

.custom-card :deep(.v-row--density-default) {
    --v-col-gap-x: 24px;
    --v-col-gap-y: 2%;
}

.custom-card :deep(.v-field--center-affix .v-label.v-field-label) {
    left: 5%;
}
.custom-card :deep(.v-label.v-field-label) {
    left: 5%;
}

</style>
