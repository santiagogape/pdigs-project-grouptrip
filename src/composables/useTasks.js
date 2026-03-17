import { ref } from 'vue';
import { db } from 'services/remote/firebase/config';
import { collection, getDocs, addDoc } from 'firebase/firestore';

export function useTasks() {
  const tasks = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const fetchTasks = async () => {
    loading.value = true;
    try {
      const querySnapshot = await getDocs(collection(db, "tasks"));
      tasks.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      error.value = "Error al cargar tareas";
    } finally {
      loading.value = false;
    }
  };

  const addTask = async (taskData) => {
    try {
      await addDoc(collection(db, "tasks"), taskData);
      await fetchTasks();
    } catch (err) {
      error.value = "Error al añadir tarea";
    }
  };

  return { tasks, loading, error, fetchTasks, addTask };
}