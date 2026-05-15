import { auth, db } from '@/services/remote/firebase/config';
import {
  collection, doc, addDoc, getDoc, getDocs, query, where,
  deleteDoc, updateDoc,
  type Unsubscribe,
  onSnapshot
} from 'firebase/firestore';

import type { Proyecto, Evento, ProyectoUsuario, Usuario } from '@/interfaces/models';

export const projectService = {

  async createUser(userData: Omit<Usuario, 'uid'>): Promise<string> {
    const usersRef = collection(db, 'usuarios');
    const newDoc = await addDoc(usersRef, { ...userData });
    return newDoc.id;
  },

  async getUser(userId: string): Promise<Usuario | null> {
    const docRef = doc(db, 'usuarios', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { uid: snap.id, ...snap.data() } as Usuario;
    }
    return null;
  },

  async createProject(projectData: Omit<Proyecto, 'projectId' | 'owner'>): Promise<string> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Debes estar logueado");

    const projectRef = collection(db, 'proyectos');

    // Guardamos el proyecto con el owner real
    const docData = { ...projectData, owner: currentUser.uid };
    const newDoc = await addDoc(projectRef, docData);

    // Crear la relación en la tabla intermedia
    const relation: ProyectoUsuario = {
      projectId: newDoc.id,
      userId: currentUser.uid
    };

    await addDoc(collection(db, 'proyecto_usuario'), relation);
    return newDoc.id;
  },

  async updateProject(
    projectId: string,
    projectData: Partial<Omit<Proyecto, 'projectId' | 'owner' | 'eventos'>>
  ): Promise<boolean> {
    try {
      const projectRef = doc(db, 'proyectos', projectId);
      await updateDoc(projectRef, this.stripUndefinedValues(projectData));
      return true;
    } catch (error) {
      console.error('Error actualizando proyecto:', error);
      return false;
    }
  },

  async addUserToProject(projectId: string, userId: string): Promise<boolean> {
    const project = await this.getProject(projectId);
    if (!project) throw new Error('El proyecto no existe');

    const relationRef = collection(db, 'proyecto_usuario');
    const q = query(relationRef, where('projectId', '==', projectId), where('userId', '==', userId));
    const snap = await getDocs(q);

    if (!snap.empty) return true;

    await addDoc(relationRef, { projectId, userId } satisfies ProyectoUsuario);
    return true;
  },

  async addEventToProject(projectId: string, eventData: Evento): Promise<void> {
    const eventsRef = collection(db, 'proyectos', projectId, 'eventos');
    await addDoc(eventsRef, this.stripUndefinedValues({ ...eventData }));
  },

  async getProject(projectId: string): Promise<Proyecto | null> {
    const docRef = doc(db, 'proyectos', projectId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      // Mapeamos explícitamente el ID de Firestore a tu projectId de la interfaz
      const data = snap.data();
      return {
        ...data,
        projectId: snap.id
      } as Proyecto;
    }
    return null;
  },

  async getEventsByProject(projectId: string): Promise<Evento[]> {
    const eventsRef = collection(db, 'proyectos', projectId, 'eventos');
    const snap = await getDocs(eventsRef);
    return snap.docs.map(doc => ({
      ...doc.data(),
    } as Evento));
  },

  async updateEvent(projectId:string, event:Evento): Promise<boolean> {
    try {
    if (!event.id) throw new Error('ID requerido');

    const { id, ...data } = event;

    const ref = doc(db, `proyectos/${projectId}/eventos/${id}`);

    await updateDoc(ref, this.stripUndefinedValues(data));

    return true;

  } catch (error) {
    console.error('Error actualizando evento:', error);
    return false;
  }
  },

  async deleteEvent(projectId:string, eventId:string): Promise<boolean> {
    try {
      const ref = doc(db, `proyectos/${projectId}/eventos/${eventId}`);
      await deleteDoc(ref);
      return true;
    } catch (error) {
      console.error('Error eliminando evento:', error);
      return false;
    }
  },


  async getProjectsByUser(userId: string): Promise<Proyecto[]> {
    const relationRef = collection(db, 'proyecto_usuario');
    const q = query(relationRef, where('userId', '==', userId));
    const snap = await getDocs(q);
    const projectIds = snap.docs.map(doc => doc.data().projectId);

    const projects: Proyecto[] = [];
    for (const id of projectIds) {
      const project = await this.getProject(id);
      if (project) projects.push(project);
    }
    return projects;
  },

  async getUsersByProject(projectId: string): Promise<Usuario[]> {
    const relationRef = collection(db, 'proyecto_usuario');
    const q = query(relationRef, where('projectId', '==', projectId));
    const snap = await getDocs(q);

    const userIds = snap.docs.map(doc => doc.data().userId as string);

    const users: Usuario[] = [];
    for (const id of userIds) {
      const user = await this.getUser(id);
      if (user) users.push(user);
    }

    return users;
},

  async removeProject(projectId: string): Promise<void> {
    const res = await this._removeProjectUserRelation(projectId);
    if (!res) throw new Error("No se pudo eliminar las relaciones del proyecto");

    const eventsRef = collection(db, 'proyectos', projectId, 'eventos');
    const eventsSnap = await getDocs(eventsRef);
    await Promise.all(eventsSnap.docs.map(eventDoc => deleteDoc(eventDoc.ref)));

    await deleteDoc(doc(db, 'proyectos', projectId));
  },

  async _removeProjectUserRelation(projectId: string): Promise<boolean> {
    const relationRef = collection(db, 'proyecto_usuario');
    const q = query(relationRef, where('projectId', '==', projectId));
    const snap = await getDocs(q);
    return Promise.all(snap.docs.map(doc => deleteDoc(doc.ref))).then(() => true);
  },

  async removeUserFromProject(projectId: string, userId: string): Promise<boolean> {
    const relationRef = collection(db, 'proyecto_usuario');
    const q = query(relationRef, where('projectId', '==', projectId), where('userId', '==', userId));
    const snap = await getDocs(q);
    if (snap.empty) return false;
    if (snap.docs[0] == undefined) return false;
    return deleteDoc(snap.docs[0].ref).then(() => true);
  },

  subscribeToProject(projectId: string, callback: (p: Proyecto | null) => void): Unsubscribe {
    const docRef = doc(db, 'proyectos', projectId);

    // onSnapshot devuelve una función para dejar de escuchar
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        callback({ projectId: snap.id, ...snap.data() } as Proyecto);
      } else {
        callback(null);
      }
    });
  },

  subscribeToEvents(projectId: string, callback: (e: Evento[]) => void): Unsubscribe {
    const eventsRef = collection(db, 'proyectos', projectId, 'eventos');

    return onSnapshot(eventsRef, (snap) => {
      const events = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Si necesitas el ID del evento, podrías añadirlo aquí
      } as Evento));
      callback(events);
    });
  }

  ,

  stripUndefinedValues<T extends Record<string, unknown>>(data: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    ) as Partial<T>;
  }
};
