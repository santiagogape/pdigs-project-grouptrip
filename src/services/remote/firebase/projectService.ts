import { db } from '@/services/remote/firebase/config'; // Asegura el uso del alias @ si lo configuraste
import {
  collection, doc, addDoc, getDoc, getDocs, query, where,
  deleteDoc,
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

  async createProject(projectData: Omit<Proyecto, 'projectId'>, ownerId: string): Promise<string> {
    const projectRef = collection(db, 'proyectos');

    // Convertimos a objeto plano para evitar problemas con tipos de TS
    const docData = { ...projectData, owner: ownerId };
    const newDoc = await addDoc(projectRef, docData);

    const relation: ProyectoUsuario = {
      projectId: newDoc.id,
      userId: ownerId
    };

    await addDoc(collection(db, 'proyecto_usuario'), relation);
    return newDoc.id;
  },

  async addEventToProject(projectId: string, eventData: Evento): Promise<void> {
    const eventsRef = collection(db, 'proyectos', projectId, 'eventos');
    // Usamos spread para asegurarnos de que pasamos un objeto limpio
    await addDoc(eventsRef, { ...eventData });
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

  async removeProject(projectId: string): Promise<void> {
    const res = await this._removeProjectUserRelation(projectId);
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
        ...doc.data(),
        // Si necesitas el ID del evento, podrías añadirlo aquí
      } as Evento));
      callback(events);
    });
  }
};
