// --- Modelo de Usuario ---
export interface Usuario {
  uid: string; // PK
  nombre: string;
  urlPerfil: string;
}

// --- Modelo de Gastos (Sub-objeto de Evento) ---
export interface Gasto {
  usuarioId: string; // FK -> Usuario
  monto: number;
}

// --- Modelo de Eventos (Anidado en Proyecto) ---
export interface Evento {
  id?: string;
  nombre: string;
  tipo: string;
  fechaHoraInicio: number; // Millis
  fechaHoraFin: number;    // Millis
  precio?: number;         // Opcional
  lugar?: string;          // Opcional (XYZ)
  gastos: Gasto[];
}

// --- Modelo de Proyecto ---
export interface Proyecto {
  projectId: string; // PK
  owner: string;     // FK -> Usuario
  urlPortada: string;
  destino: string;
  descripcion: string;
  presupuesto: number;
  fechaInicio: number; // Millis
  fechaFin: number;    // Millis
  eventos?: Evento[];
}

// --- Relación Muchos a Muchos (Tabla intermedia) ---
export interface ProyectoUsuario {
  projectId: string; // FK
  userId: string;    // FK
}

