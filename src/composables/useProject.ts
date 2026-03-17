import { ref, onUnmounted } from 'vue';
import { projectService } from '@/services/remote/firebase/projectService';
import type { Proyecto, Evento } from '@/interfaces/models';

export function useProject(projectId: string) {
  const project = ref<Proyecto | null>(null);
  const events = ref<Evento[]>([]);

  // Guardamos las funciones de desuscripción
  let unsubProject: () => void;
  let unsubEvents: () => void;

  const startListening = () => {
    unsubProject = projectService.subscribeToProject(projectId, (data) => {
      project.value = data;
    });

    unsubEvents = projectService.subscribeToEvents(projectId, (data) => {
      events.value = data;
    });
  };

  // ¡MUY IMPORTANTE! Limpiar al salir para no gastar cuota de Firebase
  onUnmounted(() => {
    if (unsubProject) unsubProject();
    if (unsubEvents) unsubEvents();
  });

  return { project, events, startListening };
}