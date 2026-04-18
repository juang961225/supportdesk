// Tipos compartidos en toda la app
export interface User {
  _id?: string
  id?: string
  nombre: string
  email: string
  rol: 'superadmin' | 'admin' | 'soporte' | 'usuario'
  estado?: 'activo' | 'inactivo'
  marca?: {
    _id: string
    nombre: string
  }
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
  archivos: string[]
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
}