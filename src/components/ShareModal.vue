<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelValue: boolean
  shareLink?: string
}>()

defineEmits<{
  (event: 'update:modelValue', value: boolean): void
}>()

const copied = ref(false)

const copyLink = async () => {
  if (!props.shareLink) return

  try {
    await navigator.clipboard.writeText(props.shareLink)
    copied.value = true
    window.setTimeout(() => {
      copied.value = false
    }, 1800)
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="520"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="gt-card share-card" elevation="0">
      <v-card-title class="share-title">
        <v-icon icon="mdi-share-variant" color="red-darken-3" />
        Compartir proyecto
      </v-card-title>

      <v-card-text>
        <p class="gt-muted mb-4">
          Comparte este enlace con tu grupo. Al iniciar sesión podrán unirse al proyecto.
        </p>

        <v-text-field
          :model-value="shareLink"
          readonly
          label="Enlace del proyecto"
          variant="outlined"
          append-inner-icon="mdi-content-copy"
          @click:append-inner="copyLink"
        />

        <v-alert v-if="copied" type="success" variant="tonal" density="compact">
          Enlace copiado al portapapeles.
        </v-alert>
      </v-card-text>

      <v-card-actions class="pa-6 pt-0">
        <v-spacer />
        <v-btn
          class="gt-secondary-btn"
          variant="text"
          @click="$emit('update:modelValue', false)"
        >
          Cerrar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.share-card {
  padding: 0.25rem;
}

.share-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem 1.5rem 0.75rem !important;
  color: var(--gt-text);
  font-weight: 850;
}
</style>
