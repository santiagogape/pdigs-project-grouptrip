<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { projectService } from '@/services/remote/firebase/projectService'
import openAIService from '@/services/remote/openAI/openAIService'
import type { Proyecto } from '@/interfaces/models'

const emit = defineEmits<{
  (event: 'cancelar'): void
  (event: 'crear', payload: Omit<Proyecto, 'projectId' | 'owner'>): void
}>()

interface NewProjectFormState {
  destino: string
  fechaInicio: string
  fechaFin: string
  nombre: string
  presupuesto: number
  descripcion: string
  urlPortada: string
}

const aiPrompt = ref('')
const isGeneratingAI = ref(false)
const aiError = ref('')

const form = reactive<NewProjectFormState>({
  destino: '',
  fechaInicio: '',
  fechaFin: '',
  nombre: '',
  presupuesto: 2000,
  descripcion: '',
  urlPortada: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800'
})

const router = useRouter()

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

const getLastDayOfMonth = (year: number, monthIndex: number): Date => {
  return new Date(year, monthIndex + 1, 0)
}

const inferDatesFromPrompt = (prompt: string): { fechaInicio?: string; fechaFin?: string } => {
  const normalizedPrompt = prompt.toLowerCase()
  const today = new Date()
  const currentYear = today.getFullYear()

  if (normalizedPrompt.includes('proximo mes') || normalizedPrompt.includes('próximo mes')) {
    const start = new Date(currentYear, today.getMonth() + 1, 1)
    const end = getLastDayOfMonth(start.getFullYear(), start.getMonth())

    return {
      fechaInicio: formatDateForInput(start),
      fechaFin: formatDateForInput(end)
    }
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
    if (!normalizedPrompt.includes(`en ${monthName}`) && !normalizedPrompt.includes(`para ${monthName}`) && !normalizedPrompt.includes(`de ${monthName}`)) {
      continue
    }

    let year = currentYear
    if (monthIndex < today.getMonth()) {
      year += 1
    }

    const start = new Date(year, monthIndex, 1)
    const end = getLastDayOfMonth(year, monthIndex)

    return {
      fechaInicio: formatDateForInput(start),
      fechaFin: formatDateForInput(end)
    }
  }

  return {}
}

const isValidIsoDate = (value?: string): value is string => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const parsed = new Date(`${value}T00:00:00`)
  return !Number.isNaN(parsed.getTime())
}

const buildProjectData = (): Omit<Proyecto, 'projectId' | 'owner'> => {
  return {
    ...form,
    fechaInicio: new Date(form.fechaInicio).getTime(),
    fechaFin: new Date(form.fechaFin).getTime(),
    eventos: []
  }
}

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
  const projectData = buildProjectData()
  emit('crear', projectData)

  try {
    const newId = await projectService.createProject(projectData)

    if (newId) {
      router.push({ name: 'ProjectDetail', params: { id: newId } })
    }
  } catch (error) {
    console.error('Error al crear el proyecto:', error)
    alert('Hubo un error al crear el viaje')
  }
}
</script>

<template>
  <div class="setting-form-container">
    <header class="setting-form-header">
      <h2 class="setting-form-title">Crear Nuevo Viaje</h2>
      <p class="setting-form-subtitle">Completa los datos manualmente y, si quieres, usa IA como apoyo para autocompletar algunos campos</p>
    </header>

    <form @submit.prevent="handleCreateProject" class="setting-form">
      <section class="setting-form-main-panel">
        <div class="setting-form-group">
          <label class="setting-form-label">Destino *</label>
          <input v-model="form.destino" type="text" placeholder="ej. París, Tokio, Barcelona..." required class="setting-form-input" />
        </div>

        <div class="setting-form-dates">
          <div class="setting-form-group">
            <label class="setting-form-label">Fecha de inicio *</label>
            <input v-model="form.fechaInicio" type="date" required class="setting-form-input" />
          </div>
          <div class="setting-form-group">
            <label class="setting-form-label">Fecha de fin *</label>
            <input v-model="form.fechaFin" type="date" :min="form.fechaInicio" required class="setting-form-input" />
          </div>
        </div>

        <div class="setting-form-group">
          <label class="setting-form-label">Nombre del viaje *</label>
          <input v-model="form.nombre" type="text" placeholder="ej. Aventura en París" required class="setting-form-input" />
        </div>

        <div class="setting-form-group">
          <label class="setting-form-label">Presupuesto</label>
          <input v-model.number="form.presupuesto" type="number" class="setting-form-input" />
        </div>

        <div class="setting-form-group">
          <label class="setting-form-label">Descripción</label>
          <textarea v-model="form.descripcion" rows="3" placeholder="Describe tu viaje..." class="setting-form-textarea"></textarea>
        </div>

        <div class="setting-form-group setting-form-image-group">
          <div>
            <label class="setting-form-label">URL de imagen</label>
            <input v-model="form.urlPortada" type="text" class="setting-form-input" />
          </div>
          <div class="setting-form-preview-wrap">
            <img :src="form.urlPortada" alt="Preview" class="setting-form-image" />
          </div>
        </div>
      </section>

      <section class="setting-form-ai-panel">
        <div class="setting-form-ai-header">
          <span class="setting-form-ai-badge">Opcional</span>
          <div>
            <h3 class="setting-form-ai-title">Ayuda con IA</h3>
            <p class="setting-form-ai-copy">Si tienes una idea general, descríbela aquí y la IA te sugiere destino, presupuesto y duración.</p>
          </div>
        </div>

        <div class="setting-form-group">
          <label class="setting-form-label">Prompt para IA</label>
          <textarea
            v-model="aiPrompt"
            rows="3"
            placeholder="Ej: viaje de 6 días en Japón para 2 personas con presupuesto medio y plan cultural"
            class="setting-form-textarea"
          ></textarea>
        </div>

        <div class="setting-form-ai-actions">
          <button type="button" class="setting-form-ia-button" @click="handleGenerateWithAI" :disabled="isGeneratingAI">
            <span>✨</span> {{ isGeneratingAI ? 'Generando...' : 'Rellenar con IA' }}
          </button>
        </div>

        <p v-if="aiError" class="setting-form-error">{{ aiError }}</p>
      </section>

      <div class="setting-form-buttons">
        <button @click="$emit('cancelar')" type="button" class="setting-form-button-cancel">
          Cancelar
        </button>
        <button type="submit" class="setting-form-button-submit">
          Crear Viaje
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.setting-form-container {
  width: auto;
  margin: 40px 20%;
  padding: 24px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.setting-form-header {
  margin-bottom: 20px;
}

.setting-form-title {
  margin: 0;
  font-size: 24px;
  color: #1f2937;
}

.setting-form-subtitle {
  margin-top: 6px;
  font-size: 14px;
  color: #6b7280;
}

.setting-form-main-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-form-ai-panel {
  margin-top: 18px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #f9fafb;
}

.setting-form-ai-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.setting-form-ai-badge {
  display: inline-flex;
  width: fit-content;
  padding: 3px 8px;
  border-radius: 999px;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  flex-shrink: 0;
}

.setting-form-ai-title {
  margin: 0;
  font-size: 16px;
  color: #111827;
}

.setting-form-ai-copy {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: #6b7280;
}

.setting-form-label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #374151;
}

.setting-form-input,
.setting-form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  outline: none;
  font-size: 14px;
  transition: all 0.2s ease;
}

.setting-form-input:focus,
.setting-form-textarea:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.setting-form-dates {
  display: flex;
  gap: 12px;
}

.setting-form-dates .setting-form-group {
  flex: 1;
}

.setting-form-ia-button {
  width: auto;
  align-self: flex-start;
  background: #ffffff;
  color: #4f46e5;
  border: 1px solid #c7d2fe;
  padding: 10px 14px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  margin: 0;
}

.setting-form-ia-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(79, 70, 229, 0.12);
}

.setting-form-ia-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.setting-form-ai-actions {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.setting-form-error {
  margin: 4px 0 10px;
  color: #b91c1c;
  font-size: 13px;
}

.setting-form-image-group {
  display: block;
  gap: 12px;
  align-items: center;
}

.setting-form-preview-wrap {
  margin-top: 10px;
}

.setting-form-image {
  width: 100%;
  max-height: 200px;
  border-radius: 12px;
  object-fit: cover;
  border: 1px solid #e5e7eb;
}

.setting-form-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

.setting-form-button-cancel {
  background: #e5e7eb;
  color: #374151;
  padding: 10px 16px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.setting-form-button-cancel:hover {
  background: #d1d5db;
}

.setting-form-button-submit {
  background: #10b981;
  color: white;
  padding: 10px 16px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.setting-form-button-submit:hover {
  background: #059669;
}
</style>
