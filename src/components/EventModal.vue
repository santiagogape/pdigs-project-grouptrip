
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Evento } from '@/interfaces/models';

const props = defineProps<{
  visible: boolean;
  evento: Evento | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', evento: Evento): void;
}>();

// Control interno del dialog
const internalVisible = computed({
  get: () => props.visible,
  set: (val) => {
    if (!val) emit('close');
  }
});

// Formulario
const formRef = ref();
const isFormValid = ref(false);

const extractDate = (millis:number|undefined) => {
  if(millis) {
    const date = new Date(millis);
    return date.toISOString().split('T')[0];
  } return millis;
}

const extractTime = (millis:number|undefined) => {
  if(millis) {
    const date = new Date(millis);
    return date.toTimeString().slice(0, 5);
  } return millis;
}


// Datos locales
const eventForm = ref({
  id: props.evento?.id,
  nombre: props.evento?.nombre,
  tipo: props.evento?.tipo,
  fecha: extractDate(props.evento?.fechaHoraInicio),
  horaInicio: extractTime(props.evento?.fechaHoraInicio),
  horaFin: extractTime(props.evento?.fechaHoraFin),
  precio: props.evento?.precio,
  lugar: props.evento?.lugar,
})

watch(
  () => props.evento,
  (ev) => {
    if (!ev) return;

    eventForm.value = {
      id: ev.id,
      nombre: ev.nombre,
      tipo: ev.tipo,
      fecha: extractDate(ev.fechaHoraInicio),
      horaInicio: extractTime(ev.fechaHoraInicio),
      horaFin: extractTime(ev.fechaHoraFin),
      precio: ev.precio,
      lugar: ev.lugar,
    };
  },
  { immediate: true }
);
console.log(props.evento?.id);

const rules = {
  required: (v: any) => !!v || 'Campo obligatorio',

  minLength: (min: number) => (v: string) =>
    (v && v.length >= min) || `Mínimo ${min} caracteres`,

  precio: (v: number) =>
    (v >= 0) || 'El precio no puede ser negativo',

  horaValida: () => {
    if (!eventForm.value.horaInicio || !eventForm.value.horaFin) return true;
    return eventForm.value.horaFin > eventForm.value.horaInicio ||
      'Hora fin debe ser mayor que inicio';
  }
};

const combineDateAndTimeToMillis = (dateStr: string, timeStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes] = timeStr.split(':').map(Number)

  return new Date(year, month - 1, day, hours, minutes, 0, 0).getTime()
}


const convertFormToEvent = (form): Evento => {
  return {
    id: form.id,
    nombre: form.nombre,
    tipo: form.tipo,
    fechaHoraInicio: combineDateAndTimeToMillis(form.fecha, form.horaInicio),
    fechaHoraFin: combineDateAndTimeToMillis(form.fecha, form.horaFin),
    precio: form.precio ?? undefined,
    lugar: form.lugar || undefined,
    gastos: [],
  };
};

// Acciones
const close = () => emit('close');

const handleSave = async () => {
  const valid = await formRef.value.validate();

  if (!valid.valid) return;

  emit('save', convertFormToEvent(eventForm.value));
};
</script>

<template>
  <v-dialog v-model="internalVisible" max-width="550" transition="dialog-bottom-transition">
    <v-card rounded="xl" elevation="12" class="pa-2">

      <v-card-item class="pb-2">
        <template v-slot:prepend>
          <v-icon icon="mdi-calendar-edit" color="indigo" size="large" class="me-3" />
        </template>
        <v-card-title class="text-h5 font-weight-bold text-grey-darken-3">
          Editar Actividad
        </v-card-title>
        <v-card-subtitle>Ajusta los detalles de tu evento</v-card-subtitle>
      </v-card-item>

      <v-card-text class="pt-4">
        <v-form ref="formRef" v-model="isFormValid">
          <v-container class="pa-0">
            <v-row spacing="2">

              <v-col cols="12">
                <v-text-field
                  v-model="eventForm.nombre"
                  label="Nombre del evento"
                  placeholder="Ej: Cena en la playa"
                  :rules="[rules.required, rules.minLength(3)]"
                  variant="filled"
                  rounded="lg"
                  prepend-inner-icon="mdi-format-title"
                />
              </v-col>

              <v-col cols="12" sm="6">
                <v-select
                  v-model="eventForm.tipo"
                  :items="['Gastronomía', 'Transporte', 'Actividad', 'Alojamiento']"
                  label="Tipo"
                  :rules="[rules.required]"
                  variant="filled"
                  rounded="lg"
                  prepend-inner-icon="mdi-tag-outline"
                />
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="eventForm.precio"
                  label="Precio (€)"
                  type="number"
                  prefix="€"
                  :rules="[rules.required, rules.precio]"
                  variant="filled"
                  rounded="lg"
                />
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="eventForm.fecha"
                  label="Fecha"
                  type="date"
                  :rules="[rules.required]"
                  variant="filled"
                  rounded="lg"
                  prepend-inner-icon="mdi-calendar"
                />
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="eventForm.lugar"
                  label="Lugar"
                  placeholder="Ciudad o dirección"
                  :rules="[rules.required]"
                  variant="filled"
                  rounded="lg"
                  prepend-inner-icon="mdi-map-marker-outline"
                />
              </v-col>

              <v-col cols="12">
                <div class="text-caption font-weight-bold mb-2 ml-1 text-grey-darken-1">HORARIO</div>
                <div class="d-flex ga-3">
                  <v-text-field
                    v-model="eventForm.horaInicio"
                    label="Inicio"
                    type="time"
                    :rules="[rules.required]"
                    variant="outlined"
                    density="compact"
                  />
                  <v-text-field
                    v-model="eventForm.horaFin"
                    label="Fin"
                    type="time"
                    :rules="[rules.required, rules.horaValida]"
                    variant="outlined"
                    density="compact"
                  />
                </div>
              </v-col>
            </v-row>
          </v-container>
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-4 pt-0">
        <v-btn
          variant="text"
          color="grey-darken-1"
          rounded="pill"
          class="px-6"
          @click="close"
        >
          Descartar
        </v-btn>

        <v-spacer />

        <v-btn
          color="indigo-darken-1"
          variant="elevated"
          rounded="pill"
          class="px-8 font-weight-bold"
          :disabled="!isFormValid"
          @click="handleSave"
          elevation="2"
        >
          Guardar Cambios
        </v-btn>
      </v-card-actions>

    </v-card>
  </v-dialog>
</template>
