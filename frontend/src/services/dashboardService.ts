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
  urgentes: Pick<Ticket, '_id' | 'titulo' | 'estado' | 'prioridad' | 'fechaLimite' | 'area' | 'asignadoA' | 'sla'>[]
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

export interface SlaArea {
  areaId: string | null
  area: string
  tramos: number
  promedioMinutos: number
  vencidos: number
  porcentajeVencidos: number
}

export type PeriodoTendencias = 7 | 30 | 90

// Tickets creados en el periodo (por día o semana, estado, categoría y área) + SLA de los tramos terminados
export interface Tendencias {
  dias: PeriodoTendencias
  unidad: 'dia' | 'semana'
  total: number
  creados: { fecha: string; total: number }[]
  porEstado: { estado: Ticket['estado']; total: number }[]
  porCategoria: { id: string | null; nombre: string; total: number }[]
  porArea: { id: string | null; nombre: string; total: number }[]
  sla: SlaArea[]
}

// Solo admin: gráficas de su marca
export const getTendencias = async (dias: PeriodoTendencias): Promise<Tendencias> => {
  const response = await api.get('/dashboard/tendencias', { params: { dias } })
  return response.data.tendencias
}
