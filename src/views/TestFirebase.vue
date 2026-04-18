<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { projectService } from '@/services/remote/firebase/projectService';
import type { Proyecto, Evento, Usuario } from '@/interfaces/models';

// Estados para los formularios
const newUser = ref({ nombre: '', urlPerfil: '' });
const newProject = ref({ destino: '', descripcion: '', presupuesto: 0, ownerId: '' });
const newEvent = ref({ nombre: '', tipo: '', precio: 0, lugar: '' });

// Estados de visualización y suscripción
const activeProjectId = ref('');
const liveProject = ref<Proyecto | null>(null);
const liveEvents = ref<Evento[]>([]);
const log = ref<string[]>([]);
const loading = ref(false);

let unsubProject: (() => void) | null = null;
let unsubEvents: (() => void) | null = null;

const addLog = (msg: string) => {
  log.value.unshift(`${new Date().toLocaleTimeString()}: ${msg}`);
};

// --- ACCIONES ---

const createUser = async () => {
  try {
    const id = await projectService.createUser(newUser.value);
    addLog(`Usuario creado: ${id}`);
    newProject.value.ownerId = id; // Auto-rellenar para comodidad
  } catch (e: any) { addLog(`Error: ${e.message}`); }
};

const createProject = async () => {
  const { ownerId, ...data } = newProject.value;
  try {
    const id = await projectService.createProject({
      ...data,
      urlPortada: 'https://picsum.photos/200',
      fechaInicio: Date.now(),
      fechaFin: Date.now() + 1000000
    });
    activeProjectId.value = id;
    startSubscriptions(id);
    addLog(`Proyecto creado: ${id}`);
  } catch (e: any) { addLog(`Error: ${e.message}`); }
};

const addEvent = async () => {
  if (!activeProjectId.value) return;
  try {
    const eventData: Evento = {
      ...newEvent.value,
      fechaHoraInicio: Date.now(),
      fechaHoraFin: Date.now() + 3600,
      gastos: []
    };
    await projectService.addEventToProject(activeProjectId.value, eventData);
    addLog(`Evento "${eventData.nombre}" añadido.`);
  } catch (e: any) { addLog(`Error: ${e.message}`); }
};

const startSubscriptions = (id: string) => {
  // Limpiar suscripciones previas si existen
  if (unsubProject) unsubProject();
  if (unsubEvents) unsubEvents();

  addLog(`Suscribiéndose al proyecto ${id}...`);
  unsubProject = projectService.subscribeToProject(id, (p) => { liveProject.value = p; });
  unsubEvents = projectService.subscribeToEvents(id, (e) => { liveEvents.value = e; });
};

onUnmounted(() => {
  unsubProject?.();
  unsubEvents?.();
});
</script>

<template>
  <div class="lab-container">
    <div class="forms-grid">
      <section class="card">
        <h3>1. Crear Usuario</h3>
        <input v-model="newUser.nombre" placeholder="Nombre" />
        <input v-model="newUser.urlPerfil" placeholder="URL Foto" />
        <button @click="createUser">Guardar Usuario</button>
      </section>

      <section class="card">
        <h3>2. Crear Proyecto</h3>
        <input v-model="newProject.ownerId" placeholder="ID del Dueño" />
        <input v-model="newProject.destino" placeholder="Destino" />
        <textarea v-model="newProject.descripcion" placeholder="Descripción"></textarea>
        <input type="number" v-model="newProject.presupuesto" placeholder="Presupuesto" />
        <button @click="createProject" :disabled="!newProject.ownerId">Crear e Iniciar Escucha</button>
      </section>

      <section class="card" v-if="activeProjectId">
        <h3>3. Añadir Evento a: {{ activeProjectId }}</h3>
        <input v-model="newEvent.nombre" placeholder="Nombre Evento" />
        <input v-model="newEvent.tipo" placeholder="Tipo (Vuelo, Hotel...)" />
        <input type="number" v-model="newEvent.precio" placeholder="Precio" />
        <button @click="addEvent">Añadir Evento</button>
      </section>
    </div>

    <hr />

    <div class="live-results" v-if="liveProject">
      <h2>Monitor en Tiempo Real (Firestore Snapshot)</h2>
      <div class="project-display">
        <p><strong>Destino:</strong> {{ liveProject.destino }}</p>
        <p><strong>Descripción:</strong> {{ liveProject.descripcion }}</p>
        <div class="event-list">
          <h4>Eventos en subcolección:</h4>
          <ul>
            <li v-for="(ev, i) in liveEvents" :key="i">
              {{ ev.nombre }} - {{ ev.tipo }} | <strong>${{ ev.precio }}</strong>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="console">
      <div v-for="(msg, i) in log" :key="i" class="log-line">{{ msg }}</div>
    </div>
  </div>
</template>

<style scoped>
.lab-container { max-width: 1000px; margin: auto; padding: 20px; font-family: 'Segoe UI', sans-serif; }
.forms-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
.card { background: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 12px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
input, textarea { padding: 8px; border: 1px solid #ccc; border-radius: 6px; }
button { padding: 10px; background: #42b883; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
button:disabled { background: #a8d5c0; cursor: not-allowed; }
.live-results { margin-top: 30px; padding: 20px; background: #eef9f5; border-radius: 12px; border: 2px dashed #42b883; }
.console { margin-top: 20px; background: #1e1e1e; color: #4af626; padding: 15px; border-radius: 8px; font-family: monospace; height: 150px; overflow-y: auto; font-size: 13px; }
.log-line { border-bottom: 1px solid #333; padding: 2px 0; }
</style>
