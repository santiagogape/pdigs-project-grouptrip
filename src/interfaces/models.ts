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
  optional: boolean; // Indica si el evento es opcional o no
  nombre: string;
  tipo: string;
  fechaInicio: number // formato = yyyymmdd
  fechaFin: number
  horaInicio: number // hhMM
  horaFin: number
  precio?: number | null;
  lugar?: string | null;
  lat?: number | null;
  lng?: number | null;
  gastos: Gasto[];
  descripcion?: string | null;
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

