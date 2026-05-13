<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import NavBar from '@/components/testing/NavBar.vue'
import TheFooter from '@/components/testing/TheFooter.vue'
import NewProjectForm from '@/components/NewProjectForm.vue'

const router = useRouter()

const hasUnsavedChanges = ref(false)

const handleDirtyChange = (value: boolean): void => {
  hasUnsavedChanges.value = value
}

const handleCancel = (): void => {
  if (hasUnsavedChanges.value) {
    const confirmCancel = window.confirm(
      'Tienes cambios sin guardar. ¿Seguro que quieres cancelar?'
    )

    if (!confirmCancel) {
      return
    }
  }

  hasUnsavedChanges.value = false
  router.push({ name: 'Dashboard' })
}

onBeforeRouteLeave(() => {
  if (!hasUnsavedChanges.value) {
    return true
  }

  return window.confirm(
    'Tienes cambios sin guardar. ¿Seguro que quieres salir de esta página?'
  )
})
</script>

<template>
  <v-app>
    <NavBar />
    <v-main class="gt-page">
      <NewProjectForm
        @cambios="handleDirtyChange"
        @cancelar="handleCancel"
      />
    </v-main>
    <TheFooter />
  </v-app>
</template>
