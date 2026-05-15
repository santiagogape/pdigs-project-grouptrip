<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { projectService } from '@/services/remote/firebase/projectService'
import openAIService from '@/services/remote/openAI/openAIService'
import type { Proyecto } from '@/interfaces/models'

const emit = defineEmits<{
  (event: 'cancelar'): void
  (event: 'crear', payload: Omit<Proyecto, 'projectId' | 'owner'>): void
  (event: 'cambios', value: boolean): void
}>()

const router = useRouter()
const aiPrompt = ref('')
const isGeneratingAI = ref(false)
const isCreating = ref(false)
const aiError = ref('')
const submitError = ref('')
const hasUnsavedChanges = ref(false)

const form = reactive({
  destino: '',
  fechaInicio: '',
  fechaFin: '',
  nombre: '',
  presupuesto: 2000,
  descripcion: '',
  urlPortada: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=900&auto=format&fit=crop'
})

const markAsDirty = (): void => {
  if (hasUnsavedChanges.value) return
  hasUnsavedChanges.value = true
  emit('cambios', true)
}

const resetDirtyState = (): void => {
  hasUnsavedChanges.value = false
  emit('cambios', false)
}

watch(form, markAsDirty, { deep: true })
watch(aiPrompt, markAsDirty)

const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const applyTripDuration = (durationDays: number): void => {
  const safeDuration = Math.max(1, Math.round(durationDays))
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + safeDuration - 1)
  form.fechaInicio = formatDateForInput(start)
  form.fechaFin = formatDateForInput(end)
}

const getLastDayOfMonth = (year: number, monthIndex: number): Date =>
  new Date(year, monthIndex + 1, 0)

const inferDatesFromPrompt = (prompt: string): { fechaInicio?: string; fechaFin?: string } => {
  const normalizedPrompt = prompt.toLowerCase()
  const today = new Date()
  const currentYear = today.getFullYear()

  if (normalizedPrompt.includes('proximo mes') || normalizedPrompt.includes('próximo mes')) {
    const start = new Date(currentYear, today.getMonth() + 1, 1)
    const end = getLastDayOfMonth(start.getFullYear(), start.getMonth())
    return { fechaInicio: formatDateForInput(start), fechaFin: formatDateForInput(end) }
  }

  const monthMap: Record<string, number> = {
    enero: 0,
    febrero: 1,
    marzo: 2,
    abril: 3,
    mayo: 4,
    junio: 5,
    julio: 6,
    agosto: 7,
    septiembre: 8,
    setiembre: 8,
    octubre: 9,
    noviembre: 10,
    diciembre: 11
  }

  for (const [monthName, monthIndex] of Object.entries(monthMap)) {
    if (
      !normalizedPrompt.includes(`en ${monthName}`) &&
      !normalizedPrompt.includes(`para ${monthName}`) &&
      !normalizedPrompt.includes(`de ${monthName}`)
    ) {
      continue
    }

    const year = monthIndex < today.getMonth() ? currentYear + 1 : currentYear
    const start = new Date(year, monthIndex, 1)
    const end = getLastDayOfMonth(year, monthIndex)
    return { fechaInicio: formatDateForInput(start), fechaFin: formatDateForInput(end) }
  }

  return {}
}

const isValidIsoDate = (value?: string): value is string => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return !Number.isNaN(new Date(`${value}T00:00:00`).getTime())
}

const buildProjectData = (): Omit<Proyecto, 'projectId' | 'owner'> => ({
  ...form,
  fechaInicio: new Date(form.fechaInicio).getTime(),
  fechaFin: new Date(form.fechaFin).getTime(),
  eventos: []
})

const handleGenerateWithAI = async (): Promise<void> => {
  if (!aiPrompt.value.trim()) {
    aiError.value = 'Escribe un prompt para generar los detalles del viaje.'
    return
  }

  isGeneratingAI.value = true
  aiError.value = ''

  try {
    const suggestion = await openAIService.generateTripFormSuggestion(aiPrompt.value)
    const inferredDates = inferDatesFromPrompt(aiPrompt.value)

    form.destino = suggestion.destino
    form.presupuesto = Math.round(suggestion.presupuesto)
    form.nombre = suggestion.nombre
    form.descripcion = suggestion.descripcion

    if (suggestion.urlPortada && /^https?:\/\//i.test(suggestion.urlPortada)) {
      form.urlPortada = suggestion.urlPortada
    }

    if (isValidIsoDate(inferredDates.fechaInicio) && isValidIsoDate(inferredDates.fechaFin)) {
      form.fechaInicio = inferredDates.fechaInicio
      form.fechaFin = inferredDates.fechaFin
    } else if (isValidIsoDate(suggestion.fechaInicio) && isValidIsoDate(suggestion.fechaFin)) {
      form.fechaInicio = suggestion.fechaInicio
      form.fechaFin = suggestion.fechaFin
    } else if (isValidIsoDate(suggestion.fechaInicio)) {
      form.fechaInicio = suggestion.fechaInicio
      const startDate = new Date(`${suggestion.fechaInicio}T00:00:00`)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + Math.max(1, suggestion.duracionDias) - 1)
      form.fechaFin = formatDateForInput(endDate)
    } else {
      applyTripDuration(suggestion.duracionDias)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    aiError.value = `No se pudo generar el viaje con IA: ${message}`
  } finally {
    isGeneratingAI.value = false
  }
}

const handleCreateProject = async (): Promise<void> => {
  submitError.value = ''

  if (!form.destino || !form.nombre || !form.fechaInicio || !form.fechaFin) {
    submitError.value = 'Completa destino, nombre y fechas para crear el viaje.'
    return
  }

  try {
    isCreating.value = true
    const projectData = buildProjectData()
    const newId = await projectService.createProject(projectData)
    resetDirtyState()
    emit('crear', projectData)
    router.push({ name: 'ProjectDetail', params: { id: newId } })
  } catch (error) {
    console.error('Error al crear el proyecto:', error)
    submitError.value = 'Hubo un error al crear el viaje. Revisa los datos e inténtalo otra vez.'
  } finally {
    isCreating.value = false
  }
}
</script>

<template>
  <div class="project-form gt-container">
    <header class="project-form-header">
      <p class="gt-kicker">Nuevo proyecto</p>
      <h2 class="gt-title">Crear nuevo viaje</h2>
      <p class="gt-muted">Completa los datos manualmente o usa IA como apoyo para aterrizar la primera versión.</p>
    </header>

    <v-form @submit.prevent="handleCreateProject">
      <v-row>
        <v-col cols="12" md="8">
          <v-card class="gt-card pa-6" elevation="0">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field v-model="form.destino" label="Destino" variant="outlined" prepend-inner-icon="mdi-map-marker-outline" required />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="form.nombre" label="Nombre del viaje" variant="outlined" prepend-inner-icon="mdi-flag-outline" required />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="form.fechaInicio" type="date" label="Fecha de inicio" variant="outlined" required />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="form.fechaFin" type="date" label="Fecha de fin" :min="form.fechaInicio" variant="outlined" required />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model.number="form.presupuesto" type="number" min="0" label="Presupuesto" prefix="€" variant="outlined" />
              </v-col>
              <v-col cols="12">
                <v-textarea v-model="form.descripcion" rows="4" label="Descripción" variant="outlined" />
              </v-col>
              <v-col cols="12">
                <v-text-field v-model="form.urlPortada" label="URL de imagen" variant="outlined" prepend-inner-icon="mdi-image-outline" />
              </v-col>
            </v-row>
          </v-card>
        </v-col>

        <v-col cols="12" md="4">
          <v-card class="gt-card preview-card" elevation="0">
            <v-img :src="form.urlPortada" alt="Vista previa del viaje" height="210" cover />
            <div class="preview-copy">
              <v-chip color="red-darken-3" variant="tonal" size="small">{{ form.destino || 'Destino' }}</v-chip>
              <h3>{{ form.nombre || 'Nombre del viaje' }}</h3>
              <p>{{ form.descripcion || 'La descripción aparecerá aquí mientras completas el formulario.' }}</p>
            </div>
          </v-card>

          <v-card class="gt-card ai-card mt-4" elevation="0">
            <v-chip color="yellow-darken-3" variant="tonal" size="small" class="mb-3">Opcional</v-chip>
            <h3>Ayuda con IA</h3>
            <p class="gt-muted">Describe tu idea y la IA sugerirá destino, presupuesto y duración.</p>
            <v-textarea
              v-model="aiPrompt"
              rows="4"
              class="mt-4"
              label="Prompt para IA"
              variant="outlined"
            />
            <v-alert v-if="aiError" type="warning" variant="tonal" density="compact" class="mb-3">
              {{ aiError }}
            </v-alert>
            <v-btn
              type="button"
              class="gt-secondary-btn"
              variant="outlined"
              color="red-darken-3"
              prepend-icon="mdi-auto-fix"
              :loading="isGeneratingAI"
              @click="handleGenerateWithAI"
            >
              Rellenar con IA
            </v-btn>
          </v-card>
        </v-col>
      </v-row>

      <v-alert v-if="submitError" type="error" variant="tonal" class="mt-5">
        {{ submitError }}
      </v-alert>

      <div class="form-actions">
        <v-btn type="button" class="gt-secondary-btn" variant="text" @click="emit('cancelar')">
          Cancelar
        </v-btn>
        <v-btn type="submit" class="gt-primary-btn" prepend-icon="mdi-check" :loading="isCreating">
          Crear viaje
        </v-btn>
      </div>
    </v-form>
  </div>
</template>

<style scoped>

.project-form {
  padding-block: 3rem 4rem;
}

.project-form-header {
  margin-bottom: 1.5rem;
}

.project-form-header h2 {
  font-size: clamp(2.1rem, 5vw, 3.8rem);
}

.preview-card {
  overflow: hidden;
}

.preview-copy,
.ai-card {
  padding: 1.25rem;
}

.preview-copy h3,
.ai-card h3 {
  margin-top: 0.75rem;
  color: var(--gt-text);
  font-weight: 850;
}

.preview-copy p {
  margin-top: 0.5rem;
  color: var(--gt-muted);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}
</style>
