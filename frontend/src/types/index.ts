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
// SLA en este momento: % del plazo vigente consumido en tiempo laboral y urgencia (lo calcula el backend)
export interface SlaActual {
  porcentaje: number
  restanteMinutos: number    // laborales hasta la fecha límite
  vencidoHaceMinutos: number // reales desde que venció
  minutosJornada: number     // jornada de la marca: lo restante se muestra en días laborales
  nivel: 'ok' | 'atencion' | 'pronto' | 'vencido'
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
  sla?: SlaActual | null // null si está cerrado o no tiene fecha límite
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

// Horario laboral de la marca (hora Colombia). dias: 0 = domingo … 6 = sábado
export interface HorarioLaboral {
  dias: number[]
  inicio: string
  fin: string
  pausa: { inicio: string; fin: string } | null // almuerzo: el reloj no corre
  festivos: string[]
}

// Paso de un ticket por un área (tiempo en horario laboral). salida null = en curso
export interface Tramo {
  areaId: string | null
  area: string
  entrada: string
  salida: string | null
  minutosLaborales: number
  fechaLimite: string | null
  vencido: boolean | null // null = sin fecha límite (tickets antiguos)
}
