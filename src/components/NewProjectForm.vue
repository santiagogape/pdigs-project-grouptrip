<script setup lang="ts">
import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import { projectService } from '@/services/remote/firebase/projectService';

const emit = defineEmits(['cancelar', 'crear']);

// Estado inicial siguiendo tu modelo de datos
const form = reactive({
  destino: '',
  fechaInicio: '',
  fechaFin: '',
  nombre: '',
  presupuesto: 2000,
  descripcion: '',
  urlPortada: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800',
});

const emitForm = () => {
  // Convertimos las fechas a millis antes de enviar
  const formData = {
    ...form,
    fechaInicio: new Date(form.fechaInicio).getTime(),
    fechaFin: new Date(form.fechaFin).getTime(),
    eventos: [] // Inicialmente vacío
  };
  emit('crear', formData);
};

const router = useRouter();

const handleCreateProject = async (formData: any) => {
  try {
    // 1. Llamamos a la API (necesitas un ownerId, aquí uso uno de prueba)
    const ownerId = "id-del-usuario-actual"; 
    
    // createProject devuelve el ID del documento creado en Firestore
    const newId = await projectService.createProject(formData, ownerId);

    // 2. Si se creó correctamente, viajamos a la página de detalle
    if (newId) {
      router.push({ name: 'ProjectDetail', params: { id: newId } });
    }
  } catch (error) {
    console.error("Error al crear el proyecto:", error);
    alert("Hubo un error al crear el viaje");
  }
};

</script>

<template>
  <div class="setting-form-container">
    <header class="setting-form-header">
      <h2 class="setting-form-title">Crear Nuevo Viaje</h2>
      <p class="setting-form-subtitle">Usa IA para generar sugerencias o completa manualmente</p>
    </header>

    <form @submit.prevent="emitForm" class="setting-form">

      <div class="setting-form-group">
        <label class="setting-form-label">Destino *</label>
        <input v-model="form.destino" type="text" placeholder="ej. París, Tokio, Barcelona..."
          required class="setting-form-input"/>
      </div>

      <button type="button" class="setting-form-ia-button">
        <span>✨</span> Generar Detalles con IA
      </button>

      <div class="setting-form-dates">
        <div class="setting-form-group">
          <label class="setting-form-label">Fecha de inicio *</label>
          <input v-model="form.fechaInicio" type="date" required class="setting-form-input"/>
        </div>
        <div class="setting-form-group">
          <label class="setting-form-label">Fecha de fin *</label>
          <input v-model="form.fechaFin" type="date" required class="setting-form-input"/>
        </div>
      </div>

      <div class="setting-form-group">
        <label class="setting-form-label">Nombre del viaje *</label>
        <input v-model="form.nombre" type="text" placeholder="ej. Aventura en París"
        required class="setting-form-input"/>
      </div>

      <div class="setting-form-group">
        <label class="setting-form-label">Presupuesto</label>
        <input v-model.number="form.presupuesto" type="number" class="setting-form-input"/>
      </div>

      <div class="setting-form-group">
        <label class="setting-form-label">Descripción</label>
        <textarea v-model="form.descripcion" rows="3" placeholder="Describe tu viaje..." class="setting-form-textarea"></textarea>
      </div>

      <div class="setting-form-group setting-form-image-group">
        <div>
          <label class="setting-form-label">URL de imagen</label>
          <input v-model="form.urlPortada" type="text" class="setting-form-input"/>
        </div>
        <div style="margin-top: 10px;">
          <img :src="form.urlPortada" alt="Preview" class="setting-form-image"/>
        </div>
      </div>

      <div class="setting-form-buttons">
        <button @click="$emit('cancelar')" type="button" class="setting-form-button-cancel">
          Cancelar
        </button>
        <button type="submit" class="setting-form-button-submit" @click="handleCreateProject(form)">
          Crear Viaje
        </button>
      </div>

    </form>
  </div>
</template>

<style scoped>
/* Contenedor */
.setting-form-container {
  width: auto;
  margin: 40px 20%  ;
  padding: 24px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* Header */
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

/* Labels */
.setting-form-label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #374151;
}

/* Inputs y textarea */
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
  box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
}

/* Fechas lado a lado */
.setting-form-dates {
  display: flex;
  gap: 12px;
}

.setting-form-dates .setting-form-group {
  flex: 1;
}

/* Botón IA */
.setting-form-ia-button {
  width: 100%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border: none;
  padding: 10px;
  border-radius: 10px;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  margin: 10px 0;
}

.setting-form-ia-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(99,102,241,0.3);
}

/* Imagen */
.setting-form-image-group {
  display: block;
  gap: 12px;
  align-items: center;
}

.setting-form-image {
  width: 100%;
  max-height: 200px;
  border-radius: 12px;
  object-fit: cover;
  border: 1px solid #e5e7eb;
}

/* Botones final */
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
