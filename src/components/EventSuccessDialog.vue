<script setup lang="ts">
import { computed, watch, onBeforeUnmount } from 'vue';

const props = defineProps<{
  isOpen: boolean;
  message: string;
  duration?: number;
}>();

const emit = defineEmits<{
  close: [];
}>();

let timer: ReturnType<typeof setTimeout> | null = null;

const internalVisible = computed({
  get: () => props.isOpen,
  set: (value: boolean) => {
    if (!value) emit('close');
  }
});

watch(
  () => props.isOpen,
  (isOpen) => {
    if (timer) clearTimeout(timer);

    if (isOpen) {
      timer = setTimeout(() => {
        emit('close');
      }, props.duration ?? 1800);
    }
  }
);

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
});

</script>


<template>
  <v-dialog v-model="internalVisible" max-width="420">
    <v-card rounded="xl" class="pa-2">
      <v-card-text class="text-center pa-6">
        <v-icon
          icon="mdi-check-circle"
          color="success"
          size="64"
          class="mb-4"
        />

        <h3 class="text-h6 font-weight-bold mb-2">
          Evento guardado
        </h3>

        <p class="text-body-2 text-grey-darken-1 mb-6">
          {{ message }}
        </p>

      </v-card-text>
    </v-card>
  </v-dialog>
</template>
