import { auth, db } from './config';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import type { Usuario } from '@/interfaces/models';

export const authService = {
  /**
   * Registra un usuario en Firebase Auth y crea su perfil en Firestore
   */
  async register({ email, password, displayName, photoURL }: unknown): Promise<Usuario> {
    // 1. Crear usuario en Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const fbUser = userCredential.user;

    // 2. Actualizar el perfil básico en Auth
    await updateProfile(fbUser, {
      displayName: displayName,
      photoURL: photoURL || `https://ui-avatars.com/api/?name=${displayName}`
    });

    // 3. Crear el documento en la colección 'usuarios' usando el UID de Auth
    const nuevoUsuario: Usuario = {
      uid: fbUser.uid,
      nombre: displayName,
      urlPerfil: fbUser.photoURL || ''
    };

    // Usamos setDoc con el UID como ID del documento para que coincidan siempre
    await setDoc(doc(db, 'usuarios', fbUser.uid), nuevoUsuario);

    return nuevoUsuario;
  },

  /**
   * Inicia sesión con email y password
   */
  async login(email: string, password: string): Promise<Usuario | null> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Recuperar los datos adicionales de Firestore
    const docSnap = await getDoc(doc(db, 'usuarios', uid));
    if (docSnap.exists()) {
      return docSnap.data() as Usuario;
    }
    return null;
  },

  /**
   * Cierra la sesión activa
   */
  async logout(): Promise<void> {
    await signOut(auth);
  },

  /**
   * Obtiene el usuario actual (si existe sesión)
   */
  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }
};
