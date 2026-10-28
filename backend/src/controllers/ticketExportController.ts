import { Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import Ticket from '../models/Ticket'
import Area from '../models/Area'
import User from '../models/User'
import Brand from '../models/Brand'
import { AuthRequest } from '../middlewares/auth'
import { filtroDeLista } from '../utils/ticketFilters'
import { resumenSla } from '../utils/tramos'
import { estadoLegible, prioridadLegible } from '../utils/etiquetas'
import { armarFilas, columnasExportacion, formatFecha, formatFechaHora, nombreArchivo, TicketExportable } from '../utils/exportarTickets'
import { tramosEnLote } from '../services/tramos'
import { generarExcel, generarPdf } from '../services/exportacion'

const MAX_TICKETS = 5000 // protege al servidor: con más, hay que ajustar los filtros

const TIPOS_CONTENIDO = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf'
} as const

const nombreDe = async (modelo: 'area' | 'usuario' | 'marca', id: unknown): Promise<string | null> => {
  if (typeof id !== 'string' || !mongoose.isValidObjectId(id)) return null
  const doc = modelo === 'area'
    ? await Area.findById(id).select('nombre').lean()
    : modelo === 'usuario'
      ? await User.findById(id).select('nombre').lean()
      : await Brand.findById(id).select('nombre').lean()
  return doc?.nombre ?? null
}

// Filtros aplicados en texto legible, para el encabezado del PDF
const describirFiltros = async (query: Record<string, unknown>): Promise<string[]> => {
  const filtros: string[] = []
  if (typeof query.q === 'string' && query.q.trim()) filtros.push(`Búsqueda: "${query.q.trim()}"`)
  if (query.estado === 'activos') filtros.push('Estado: Activos (sin cerrados)')
  else if (typeof query.estado === 'string' && estadoLegible[query.estado]) filtros.push(`Estado: ${estadoLegible[query.estado]}`)
  if (typeof query.prioridad === 'string' && prioridadLegible[query.prioridad]) filtros.push(`Prioridad: ${prioridadLegible[query.prioridad]}`)
  const marca = await nombreDe('marca', query.marca)
  if (marca) filtros.push(`Marca: ${marca}`)
  const area = await nombreDe('area', query.area)
  if (area) filtros.push(`Área: ${area}`)
  if (query.asignado === 'sin_asignar') filtros.push('Asignado: Sin asignar')
  else {
    const asignado = await nombreDe('usuario', query.asignado)
    if (asignado) filtros.push(`Asignado: ${asignado}`)
  }
  // `hasta` llega como el inicio del día siguiente (exclusivo): se muestra el día anterior
  const desde = typeof query.desde === 'string' ? new Date(query.desde) : null
  const hasta = typeof query.hasta === 'string' ? new Date(new Date(query.hasta).getTime() - 1) : null
  if (desde && !Number.isNaN(desde.getTime())) filtros.push(`Creado desde: ${formatFecha(desde)}`)
  if (hasta && !Number.isNaN(hasta.getTime())) filtros.push(`Creado hasta: ${formatFecha(hasta)}`)
  if (query.vencimiento === 'vencidos') filtros.push('Vencimiento: Vencidos')
  if (query.vencimiento === 'pronto') filtros.push('Vencimiento: Vencen en 24 h')
  return filtros
}

// GET /api/tickets/exportar?formato=xlsx|pdf&<filtros de la lista> — admin (su marca) y superadmin
export const exportarTickets = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const formato = req.query.formato
    if (formato !== 'xlsx' && formato !== 'pdf') {
      res.status(400).json({ message: 'Formato inválido: usa xlsx o pdf' })
      return
    }

    // Mismos permisos y filtros que la lista de tickets
    const filtro = filtroDeLista(req.user!, req.query)
    const total = await Ticket.countDocuments(filtro)
    if (total > MAX_TICKETS) {
      res.status(400).json({ message: `Hay ${total} tickets con estos filtros; el máximo para exportar es ${MAX_TICKETS}. Ajusta los filtros.` })
      return
    }

    // Forma de cada ticket con sus referencias pobladas
    type TicketLeido = TicketExportable & {
      _id: mongoose.Types.ObjectId
      marca: { _id: mongoose.Types.ObjectId; nombre: string }
      area?: { _id: mongoose.Types.ObjectId; nombre: string } | null
    }

    const leidos = await Ticket.find(filtro)
      .select('titulo estado prioridad createdAt fechaLimite fechaCierre area categoria creadoPor asignadoA marca')
      .populate('area', 'nombre')
      .populate('categoria', 'nombre')
      .populate('creadoPor', 'nombre')
      .populate('asignadoA', 'nombre')
      .populate('marca', 'nombre')
      .sort({ createdAt: -1, _id: -1 })
      .lean<TicketLeido[]>()

    const tramos = await tramosEnLote(leidos)
    const resumenes = new Map([...tramos].map(([id, t]) => [id, resumenSla(t)]))
    const filas = armarFilas(leidos, resumenes)
    const esSuperadmin = req.user!.rol === 'superadmin'
    const columnas = columnasExportacion(formato, esSuperadmin)

    const archivo = formato === 'xlsx'
      ? await generarExcel(filas, columnas)
      : await generarPdf({
        marca: esSuperadmin ? 'Todas las marcas' : (await nombreDe('marca', req.user!.marca)) ?? '',
        generado: formatFechaHora(new Date()),
        filtros: await describirFiltros(req.query),
        filas,
        columnas
      })

    res.setHeader('Content-Type', TIPOS_CONTENIDO[formato])
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo(formato)}"`)
    res.send(archivo)

  } catch (error) {
    next(error)
  }
}
