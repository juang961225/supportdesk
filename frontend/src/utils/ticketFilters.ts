import type { ClaveFiltroTicket, FiltrosTicket } from '../types'

export const CLAVES_FILTRO: ClaveFiltroTicket[] =
  ['q', 'estado', 'prioridad', 'area', 'asignado', 'marca', 'desde', 'hasta', 'vencimiento']

// Los que van dentro del panel "Más filtros"
export const CLAVES_MAS_FILTROS: ClaveFiltroTicket[] = ['asignado', 'marca', 'desde', 'hasta', 'vencimiento']

export const filtrosDesdeUrl = (params: URLSearchParams): FiltrosTicket => {
  const filtros = {} as FiltrosTicket
  for (const clave of CLAVES_FILTRO) filtros[clave] = params.get(clave) ?? ''
  return filtros
}

export const contarFiltros = (filtros: FiltrosTicket, claves: ClaveFiltroTicket[] = CLAVES_FILTRO): number =>
  claves.filter((clave) => filtros[clave]).length

// "2026-10-27" → inicio de ese día en la hora local, en ISO (el backend compara instantes)
const inicioDelDia = (fecha: string, diasExtra = 0): string => {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return new Date(anio, mes - 1, dia + diasExtra).toISOString()
}

const esFecha = (valor: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(valor)

// Parámetros para GET /tickets: omite los vacíos; `hasta` incluye todo ese día
export const filtrosParaApi = (filtros: FiltrosTicket): Record<string, string> => {
  const params: Record<string, string> = {}
  for (const clave of CLAVES_FILTRO) {
    const valor = filtros[clave]
    if (!valor) continue
    if (clave === 'desde' || clave === 'hasta') {
      if (esFecha(valor)) params[clave] = inicioDelDia(valor, clave === 'hasta' ? 1 : 0)
    } else {
      params[clave] = valor
    }
  }
  return params
}
