import api from './api'
import type { Ticket, AreaRef, Brand } from '../types'

export interface AdminSummary {
  totales: {
    abiertos: number
    enProgreso: number
    vencidos: number
    criticos: number
    cerrados: number
  }
  porArea: {
    area: AreaRef
    enCola: number
    enProgreso: number
    vencidos: number
    activo: boolean
  }[]
  cargaPorSoporte: {
    soporte: { _id: string; nombre: string }
    activos: number
    vencidos: number
  }[]
  urgentes: Pick<Ticket, '_id' | 'titulo' | 'estado' | 'prioridad' | 'fechaLimite' | 'area' | 'asignadoA'>[]
}

export interface SuperadminSummary {
  totales: {
    marcasActivas: number
    abiertos: number
    vencidos: number
    usuariosActivos: number
  }
  porMarca: {
    marca: Pick<Brand, '_id' | 'nombre' | 'estado'>
    abiertos: number
    vencidos: number
    cerrados: number
    usuariosActivos: number
  }[]
}

// El backend arma el resumen según el rol del token (admin: su marca · superadmin: global)
export const getAdminSummary = async (): Promise<AdminSummary> => {
  const response = await api.get('/dashboard/summary')
  return response.data.summary
}

export const getSuperadminSummary = async (): Promise<SuperadminSummary> => {
  const response = await api.get('/dashboard/summary')
  return response.data.summary
}
