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
  submarcas?: AreaRef[] // solo usuario: de cuáles puede crear tickets
  origen?: 'local' | 'online_brief' // online_brief: su contraseña se administra en Online Brief
  // Solo usuario de una marca ligada a Online Brief
  organizaciones?: number[]
  sedes?: string[]
  todosConcesionarios?: boolean
  todosImportadores?: boolean
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
  plazos?: AjustePlazos // lo que falte viene de la marca
}

// Plazos por prioridad, en tiempo laboral
export type Prioridad = 'critica' | 'alta' | 'media' | 'baja'
export type UnidadPlazo = 'horas' | 'dias'
export interface Plazo {
  valor: number
  unidad: UnidadPlazo
}
export type Plazos = Record<Prioridad, Plazo>
export type AjustePlazos = Partial<Plazos>

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
  estado: 'abierto' | 'en_progreso' | 'en_revision' | 'esperando_usuario' | 'resuelto' | 'cerrado' | 'reabierto'
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
  fechaLimite?: string // plazo del ticket: lo que se promete al cliente
  fechaLimiteArea?: string // plazo del tramo en el área; solo lo recibe el equipo. Sin valor: vale fechaLimite
  sla?: SlaActual | null // null si está cerrado, en pausa o no tiene fecha límite
  slaArea?: SlaActual | null
  submarca?: AreaRef | null // null solo en tickets anteriores a la migración
  contexto?: ContextoTicket | null // copia al crear; solo marcas ligadas a Online Brief
  sinAtender?: boolean // solo usuario final: nadie lo atiende aún, puede editarlo
  updatedAt?: string
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
    | 'editado'
    | 'categoria'
    | 'prioridad'
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
  descripcionAnterior?: string
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
  'q' | 'estado' | 'prioridad' | 'area' | 'submarca' | 'organizacion' | 'sede' | 'asignado' | 'marca' | 'desde' | 'hasta' | 'vencimiento'
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
  vencidoSinAjuste: boolean | null // sin contar lo que el admin amplió a mano
}

// Sub-marca dentro de una marca (BMW, MINI…). `marca` solo llega poblada para el superadmin
export interface SubMarca {
  _id: string
  nombre: string
  activo: boolean
  marca?: AreaRef | string
  onlineBriefId?: number
  organizaciones?: number[] // vacío = aplica a todas
}

// Contexto del usuario según los catálogos de Online Brief
export type TipoSede = 'concesionario' | 'importador'

export interface Sede {
  clave: string
  tipo: TipoSede
  nombre: string
  brandId: number
  subMarca: string
}

export interface ContextoUsuario {
  organizaciones: number[]
  sedes: string[]
  todosConcesionarios: boolean
  todosImportadores: boolean
}

export interface ContextoTicket {
  organizacion?: string
  tipo?: TipoSede | 'corporativo'
  clave?: string
  nombre?: string
}

export interface CatalogoContexto {
  disponible: boolean
  organizaciones: { id: number; nombre: string }[]
  sedes: Sede[]
}

export interface MiContexto {
  aplica: boolean
  todas: boolean // corporativo: puede dejar el ticket como "Corporativo"
  sedes: Sede[]
}

export interface FiltrosContexto {
  organizaciones: string[]
  sedes: string[]
}
