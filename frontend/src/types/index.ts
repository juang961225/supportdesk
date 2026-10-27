// Tipos compartidos en toda la app
export interface User {
  _id: string
  nombre: string
  email: string
  rol: 'superadmin' | 'admin' | 'soporte' | 'usuario'
  estado?: 'activo' | 'inactivo'
  marca?: {
    _id: string
    nombre: string
  }
  areas?: AreaRef[] // solo soporte
}

// Archivo adjunto (ticket o comentario). `url` es temporal: la firma el backend en cada respuesta
export interface Attachment {
  key: string
  nombre: string
  mime: string
  tamano: number
  url: string
}

// Referencia poblada a un usuario
export interface UserRef {
  _id: string
  nombre: string
  email: string
}

// Referencia poblada a un área (nombre para mostrar)
export interface AreaRef {
  _id: string
  nombre: string
}

export interface Area {
  _id: string
  nombre: string
  descripcion?: string
  activo: boolean
  marca: string
}

export interface Brand {
  _id: string
  nombre: string
  slug: string
  estado: 'activo' | 'inactivo'
  admin?: {
    _id: string
    nombre: string
    email: string
  }
  createdAt: string
}
export interface Ticket {
  _id: string
  titulo: string
  descripcion: string
  estado: 'abierto' | 'en_progreso' | 'en_revision' | 'cerrado' | 'reabierto'
  prioridad: 'baja' | 'media' | 'alta' | 'critica'
  categoria: {
    _id: string
    nombre: string
  }
  creadoPor: {
    _id: string
    nombre: string
    email: string
  }
  asignadoA?: {
    _id: string
    nombre: string
    email: string
  }
  marca: {
    _id: string
    nombre: string
  }
  area?: AreaRef // área actual (cola donde está)
  observadores?: UserRef[] // usuarios que siguen el ticket
  archivos: Attachment[]
  fechaLimite?: string
  fechaCierre?: string
  createdAt: string
}

export interface Category {
  _id: string
  nombre: string
  descripcion?: string
  activo: boolean
  marca: string
  area?: AreaRef
}
export interface TicketEvent {
  _id: string
  tipo:
    | 'creado' | 'asignado' | 'reasignado' | 'estado' | 'desasignado'
    | 'tomado' | 'soltado' | 'pasado' | 'movido'
    | 'observador_agregado' | 'observador_quitado'
    | 'fecha_limite'
  autor?: {
    _id: string
    nombre: string
    rol: User['rol']
  }
  de?: string
  a?: string
  deNombre?: string
  aNombre?: string
  motivo?: string
  fechaLimiteAnterior?: string
  fechaLimiteNueva?: string
  createdAt: string | null
  sintetico?: boolean
}

// Paso del ticket por un área (visible para todos, sin autores)
export interface TramoRecorrido {
  area: string
  desde: string
}

// Paginación de listas (?page=N); el backend la devuelve solo si se pide
export interface Paginacion {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface Paginado<T> {
  items: T[]
  pagination: Paginacion
}

// Filtros de la lista de tickets (viven en la URL). '' = sin filtro
export type ClaveFiltroTicket =
  'q' | 'estado' | 'prioridad' | 'area' | 'asignado' | 'marca' | 'desde' | 'hasta' | 'vencimiento'
export type FiltrosTicket = Record<ClaveFiltroTicket, string>
