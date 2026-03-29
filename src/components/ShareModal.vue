<template>
  <v-dialog
     :model-value="modelValue"
     @update:model-value="$emit('update:modelValue', $event)"
    max-width="500"
  >
    <v-card rounded="xl" class="pa-2">
      <v-card-title class="pa-6 text-h6 font-weight-bold d-flex align-center">
        <v-icon icon="mdi-share-variant" class="me-3" color="primary" />
        Compartir proyecto
      </v-card-title>

      <v-card-text>
        <p class="text-body-2 text-grey-darken-1 mb-4">
          Cualquier persona con este enlace podrá ver el proyecto:
        </p>

        <v-text-field
          :model-value="shareLink"  readonly
          label="Enlace del proyecto"
          variant="filled"
          rounded="lg"
          append-inner-icon="mdi-content-copy"
          @click:append-inner="copyLink"
        />
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn
          class="text-none px-6"
          color="grey-darken-1"
          variant="text"
          rounded="pill"
          @click="$emit('update:modelValue', false)"
        >
          Cerrar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">


const props = defineProps({
  modelValue: Boolean, // Controla si se ve o no
  shareLink: String
});

//const emit = defineEmits(['update:modelValu e']);

const copyLink = () => {
  if (!props.shareLink) return;
  navigator.clipboard.writeText(props.shareLink);
  // Opcional: Podrías emitir un evento de 'copiado' para mostrar un snackbar
  alert("¡Enlace copiado!");
};
</script>
