import { EstadoSla } from './tramos'
import { estadoLegible, prioridadLegible, slaLegible } from './etiquetas'
import { formatTiempoLaboral } from './formatoTiempo'

// Filas y columnas de la exportación de tickets (funciones puras: no saben de Excel, PDF ni BD)

const OFFSET_MS = -5 * 60 * 60 * 1000 // hora Colombia (UTC-5 fijo)

export interface TicketExportable {
  _id: unknown
  titulo: string
  estado: string
  prioridad: string
  createdAt: Date
  fechaLimite?: Date
  fechaCierre?: Date
  area?: { nombre: string } | null
  categoria?: { nombre: string } | null
  creadoPor?: { nombre: string } | null
  asignadoA?: { nombre: string } | null
  marca?: { nombre: string } | null
}

export interface FilaExportacion {
  titulo: string
  estado: string
  prioridad: string
  marca: string
  area: string
  categoria: string
  creadoPor: string
  asignadoA: string
  creado: Date
  fechaLimite: Date | null
  cerrado: Date | null
  tiempoLaboral: string
  horasLaborales: number
  sla: string
  vencido: boolean
}

export type ClaveColumna = keyof FilaExportacion

export interface Columna {
  clave: ClaveColumna
  titulo: string
  ancho: number // Excel: caracteres · PDF: proporción del ancho disponible
}

// Excel lleva todo; el PDF, lo que cabe en una hoja horizontal
const COLUMNAS_EXCEL: Columna[] = [
  { clave: 'titulo', titulo: 'Título', ancho: 40 },
  { clave: 'estado', titulo: 'Estado', ancho: 13 },
  { clave: 'prioridad', titulo: 'Prioridad', ancho: 10 },
  { clave: 'marca', titulo: 'Marca', ancho: 16 },
  { clave: 'area', titulo: 'Área', ancho: 18 },
  { clave: 'categoria', titulo: 'Categoría', ancho: 18 },
  { clave: 'creadoPor', titulo: 'Creado por', ancho: 20 },
  { clave: 'asignadoA', titulo: 'Asignado a', ancho: 20 },
  { clave: 'creado', titulo: 'Creado', ancho: 17 },
  { clave: 'fechaLimite', titulo: 'Fecha límite', ancho: 17 },
  { clave: 'cerrado', titulo: 'Cerrado', ancho: 17 },
  { clave: 'tiempoLaboral', titulo: 'Tiempo laboral', ancho: 18 },
  { clave: 'horasLaborales', titulo: 'Horas laborales', ancho: 15 },
  { clave: 'sla', titulo: 'SLA', ancho: 16 }
]

const COLUMNAS_PDF: Columna[] = [
  { clave: 'titulo', titulo: 'Título', ancho: 21 },
  { clave: 'estado', titulo: 'Estado', ancho: 8.5 },
  { clave: 'prioridad', titulo: 'Prioridad', ancho: 6.5 },
  { clave: 'marca', titulo: 'Marca', ancho: 10.5 },
  { clave: 'area', titulo: 'Área', ancho: 10 },
  { clave: 'asignadoA', titulo: 'Asignado a', ancho: 11 },
  { clave: 'creado', titulo: 'Creado', ancho: 10.5 },
  { clave: 'fechaLimite', titulo: 'Fecha límite', ancho: 10.5 },
  { clave: 'tiempoLaboral', titulo: 'Tiempo laboral', ancho: 13.5 },
  { clave: 'sla', titulo: 'SLA', ancho: 11 }
]

// La columna "Marca" solo tiene sentido para el superadmin (el admin ve una sola)
export const columnasExportacion = (formato: 'xlsx' | 'pdf', incluirMarca: boolean): Columna[] =>
  (formato === 'xlsx' ? COLUMNAS_EXCEL : COLUMNAS_PDF).filter((c) => incluirMarca || c.clave !== 'marca')

export const armarFilas = (
  tickets: TicketExportable[],
  resumenes: Map<string, { minutosLaborales: number; sla: EstadoSla; minutosJornada: number }>
): FilaExportacion[] =>
  tickets.map((t) => {
    const resumen = resumenes.get(String(t._id)) ?? { minutosLaborales: 0, sla: 'sin_fecha' as const, minutosJornada: 0 }
    return {
      titulo: t.titulo,
      estado: estadoLegible[t.estado] ?? t.estado,
      prioridad: prioridadLegible[t.prioridad] ?? t.prioridad,
      marca: t.marca?.nombre ?? '',
      area: t.area?.nombre ?? 'Sin área',
      categoria: t.categoria?.nombre ?? '',
      creadoPor: t.creadoPor?.nombre ?? '',
      asignadoA: t.asignadoA?.nombre ?? 'Sin asignar',
      creado: t.createdAt,
      fechaLimite: t.fechaLimite ?? null,
      cerrado: t.estado === 'cerrado' ? t.fechaCierre ?? null : null,
      tiempoLaboral: formatTiempoLaboral(resumen.minutosLaborales, resumen.minutosJornada),
      horasLaborales: Math.round((resumen.minutosLaborales / 60) * 10) / 10,
      sla: slaLegible[resumen.sla],
      vencido: resumen.sla === 'vencido'
    }
  })

// Resumen del encabezado del PDF
export const resumenReporte = (filas: FilaExportacion[]) => {
  const porEstado = new Map<string, number>()
  for (const fila of filas) porEstado.set(fila.estado, (porEstado.get(fila.estado) ?? 0) + 1)
  return {
    total: filas.length,
    porEstado: Object.values(estadoLegible)
      .map((estado) => ({ estado, total: porEstado.get(estado) ?? 0 }))
      .filter((e) => e.total > 0),
    vencidos: filas.filter((f) => f.vencido).length
  }
}

const dosDigitos = (n: number): string => String(n).padStart(2, '0')

// "27/10/2026 14:05" en hora Colombia, sin depender de la zona del servidor
export const formatFechaHora = (fecha: Date): string => {
  const d = new Date(fecha.getTime() + OFFSET_MS)
  return `${dosDigitos(d.getUTCDate())}/${dosDigitos(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ` +
    `${dosDigitos(d.getUTCHours())}:${dosDigitos(d.getUTCMinutes())}`
}

export const formatFecha = (fecha: Date): string => formatFechaHora(fecha).slice(0, 10)

// Excel guarda las fechas sin zona y las muestra tal cual: se corre a la hora de Colombia
export const fechaParaExcel = (fecha: Date): Date => new Date(fecha.getTime() + OFFSET_MS)

export const valorParaPdf = (fila: FilaExportacion, clave: ClaveColumna): string => {
  const valor = fila[clave]
  if (valor === null) return '—'
  if (valor instanceof Date) return formatFechaHora(valor)
  return String(valor)
}

// "tickets-2026-10-28.xlsx"
export const nombreArchivo = (formato: 'xlsx' | 'pdf', ahora: Date = new Date()): string => {
  const d = new Date(ahora.getTime() + OFFSET_MS)
  return `tickets-${d.getUTCFullYear()}-${dosDigitos(d.getUTCMonth() + 1)}-${dosDigitos(d.getUTCDate())}.${formato}`
}
