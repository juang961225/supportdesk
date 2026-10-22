import { Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import Ticket from '../models/Ticket'
import TicketCategory from '../models/TicketCategory'
import User from '../models/User'
import TicketEvent, { TipoEvento } from '../models/TicketEvent'
import { esEstadoValido, puedeTransicionar, aplicarEstado } from '../utils/ticketStatus'
import { AuthRequest } from '../middlewares/auth'
import { puedeVerTicket } from '../utils/ticketAccess'
import { registrarEvento } from '../services/ticketEvents'

// Calcula la fecha límite según la prioridad
const calcularFechaLimite = (prioridad: string): Date => {
  const ahora = new Date()
  const horas: Record<string, number> = {
    critica: 4,
    alta: 24,
    media: 72,
    baja: 168
  }
  ahora.setHours(ahora.getHours() + (horas[prioridad] || 72))
  return ahora
}

// POST /api/tickets — crear ticket (usuario)
export const createTicket = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { titulo, descripcion, prioridad, categoriaId } = req.body || {}

    if (!titulo || !descripcion || !prioridad || !categoriaId) {
      res.status(400).json({ message: 'Título, descripción, prioridad y categoría son obligatorios' })
      return
    }

    const prioridadesValidas = ['baja', 'media', 'alta', 'critica']
    if (!prioridadesValidas.includes(prioridad)) {
      res.status(400).json({ message: 'Prioridad inválida. Debe ser baja, media, alta o critica' })
      return
    }

    const marcaId = req.user?.marca
    if (!marcaId) {
      res.status(400).json({ message: 'No tienes una marca asignada' })
      return
    }

    // Verificar que la categoría existe y pertenece a la marca
    const categoria = await TicketCategory.findOne({
      _id: categoriaId,
      marca: marcaId,
      activo: true
    })
    if (!categoria) {
      res.status(404).json({ message: 'Categoría no encontrada o inactiva' })
      return
    }

    const fechaLimite = calcularFechaLimite(prioridad)

    const ticket = await Ticket.create({
      titulo,
      descripcion,
      prioridad,
      categoria: categoriaId,
      marca: marcaId,
      creadoPor: req.user?.id,
      fechaLimite
    })

    await registrarEvento({
      ticket: ticket._id,
      marca: ticket.marca,
      tipo: 'creado',
      autor: req.user!.id
    })

    // Populate para devolver datos completos
    const ticketPopulado = await Ticket.findById(ticket._id)
      .populate('asignadoA', 'nombre email')
      .populate('categoria', 'nombre')
      .populate('creadoPor', 'nombre email')
      .populate('marca', 'nombre')

    res.status(201).json({
      message: 'Ticket creado exitosamente',
      ticket: ticketPopulado
    })

  } catch (error) {
    next(error)
  }
}

// GET /api/tickets — listar tickets según rol
export const getTickets = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { rol, id, marca } = req.user!

    let filtro: Record<string, unknown> = {}  // ← mejorado de any a Record

    if (rol === 'superadmin') {
      // superadmin ve todos los tickets de todas las marcas
      filtro = {}
    } else if (rol === 'admin') {
      // admin ve todos los tickets de su marca
      filtro = { marca }
    } else if (rol === 'soporte') {
      // soporte solo ve los tickets asignados a él
      filtro = { asignadoA: id, marca }
    } else if (rol === 'usuario') {
      // usuario solo ve sus propios tickets
      filtro = { creadoPor: id, marca }
    }

    const tickets = await Ticket.find(filtro)
      .populate('categoria', 'nombre')
      .populate('creadoPor', 'nombre email')
      .populate('asignadoA', 'nombre email')
      .populate('marca', 'nombre')
      .sort({ createdAt: -1 })

    res.status(200).json({ tickets })

  } catch (error) {
    next(error)
  }
}

// GET /api/tickets/:id — ver un ticket
export const getTicketById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('categoria', 'nombre descripcion')
      .populate('creadoPor', 'nombre email')
      .populate('asignadoA', 'nombre email')
      .populate('marca', 'nombre')

    if (!ticket) {
      res.status(404).json({ message: 'Ticket no encontrado' })
      return
    }

    // Verificar que el usuario tiene acceso a este ticket
    if (!puedeVerTicket(req.user!, ticket)) {
      res.status(403).json({ message: 'No tienes acceso a este ticket' })
      return
    }

    res.status(200).json({ ticket })

  } catch (error) {
    next(error)
  }
}

// PUT /api/tickets/:id/assign — asignar ticket a un soporter (admin)
// La asignación no cambia el estado: el soporte lo pasa a en_progreso cuando empieza
export const assignTicket = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { soporterId } = req.body || {}

    if (!soporterId) {
      res.status(400).json({ message: 'El ID del soporter es obligatorio' })
      return
    }

    const ticket = await Ticket.findOne({
      _id: req.params.id,
      marca: req.user?.marca
    })

    if (!ticket) {
      res.status(404).json({ message: 'Ticket no encontrado' })
      return
    }

    if (ticket.estado === 'cerrado') {
      res.status(400).json({ message: 'No se puede asignar un ticket cerrado' })
      return
    }

    // El soporte debe ser de la misma marca y estar activo
    const soporte = await User.findOne({
      _id: soporterId,
      rol: 'soporte',
      marca: req.user?.marca,
      estado: 'activo'
    })
    if (!soporte) {
      res.status(400).json({ message: 'El soporte no existe, no es de tu marca o está inactivo' })
      return
    }

    const anteriorId = ticket.asignadoA
    if (anteriorId && String(anteriorId) === String(soporte._id)) {
      res.status(400).json({ message: 'El ticket ya está asignado a ese soporte' })
      return
    }
    const anterior = anteriorId ? await User.findById(anteriorId).select('nombre') : null

    ticket.asignadoA = soporte._id
    await ticket.save()

    await registrarEvento({
      ticket: ticket._id,
      marca: ticket.marca,
      tipo: anteriorId ? 'reasignado' : 'asignado',
      autor: req.user!.id,
      de: anteriorId ? String(anteriorId) : undefined,
      deNombre: anterior?.nombre,
      a: String(soporte._id),
      aNombre: soporte.nombre
    })

    const ticketActualizado = await Ticket.findById(ticket._id)
      .populate('asignadoA', 'nombre email')
      .populate('categoria', 'nombre')
      .populate('creadoPor', 'nombre email')
      .populate('marca', 'nombre')

    res.status(200).json({
      message: 'Ticket asignado exitosamente',
      ticket: ticketActualizado
    })

  } catch (error) {
    next(error)
  }
}

// PUT /api/tickets/:id/status — cambiar estado
// soporte: solo el asignado, siguiendo el flujo · usuario: solo reabrir sus tickets cerrados
export const updateTicketStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { estado } = req.body || {}
    const { rol, id } = req.user!

    if (!esEstadoValido(estado)) {
      res.status(400).json({ message: 'Estado inválido' })
      return
    }

    if (rol === 'usuario' && estado !== 'reabierto') {
      res.status(403).json({ message: 'Solo puedes reabrir un ticket' })
      return
    }

    if (rol === 'soporte' && estado === 'reabierto') {
      res.status(403).json({ message: 'Solo el usuario creador puede reabrir un ticket' })
      return
    }

    // El usuario busca entre los que creó; el soporte entre los asignados a él
    const ticket = await Ticket.findOne(
      rol === 'usuario'
        ? { _id: req.params.id, creadoPor: id }
        : { _id: req.params.id, asignadoA: id }
    )

    if (!ticket) {
      res.status(404).json({ message: 'Ticket no encontrado o sin permiso para cambiar su estado' })
      return
    }

    if (!puedeTransicionar(ticket.estado, estado)) {
      res.status(400).json({ message: `Transición no permitida: ${ticket.estado} → ${estado}` })
      return
    }

    // Al reabrir se conserva asignadoA: vuelve al soporte que lo cerró
    const estadoAnterior = ticket.estado
    aplicarEstado(ticket, estado)
    await ticket.save()

    await registrarEvento({
      ticket: ticket._id,
      marca: ticket.marca,
      tipo: 'estado',
      autor: id,
      de: estadoAnterior,
      a: estado
    })

    const ticketActualizado = await Ticket.findById(ticket._id)
      .populate('asignadoA', 'nombre email')
      .populate('categoria', 'nombre')
      .populate('creadoPor', 'nombre email')
      .populate('marca', 'nombre')

    res.status(200).json({
      message: estado === 'reabierto' ? 'Ticket reabierto exitosamente' : 'Estado actualizado exitosamente',
      ticket: ticketActualizado
    })

  } catch (error) {
    next(error)
  }
}

// Forma de cada entrada del historial que recibe el frontend
interface EventoHistorial {
  _id: string
  tipo: TipoEvento
  autor?: unknown
  de?: string
  a?: string
  deNombre?: string
  aNombre?: string
  motivo?: string
  createdAt: Date | null
  sintetico?: boolean
}

// GET /api/tickets/:id/history — historial interno (admin, soporte y superadmin)
// Los tickets anteriores al historial reciben eventos sintéticos calculados aquí (no se guardan)
export const getTicketHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('creadoPor', 'nombre rol')
      .populate('asignadoA', 'nombre')

    if (!ticket) {
      res.status(404).json({ message: 'Ticket no encontrado' })
      return
    }

    if (!puedeVerTicket(req.user!, ticket)) {
      res.status(403).json({ message: 'No tienes acceso a este ticket' })
      return
    }

    const eventos = await TicketEvent.find({ ticket: ticket._id })
      .populate('autor', 'nombre rol')
      .sort({ createdAt: 1 })
      .lean()

    const historial: EventoHistorial[] = eventos.map((e) => ({
      _id: String(e._id),
      tipo: e.tipo,
      autor: e.autor,
      de: e.de,
      a: e.a,
      deNombre: e.deNombre,
      aNombre: e.aNombre,
      motivo: e.motivo,
      createdAt: e.createdAt
    }))
    const creadoPor = ticket.creadoPor as unknown as { _id: mongoose.Types.ObjectId; nombre: string; rol: string }
    const asignado = ticket.asignadoA as unknown as { _id: mongoose.Types.ObjectId; nombre: string } | undefined

    if (!eventos.some((e) => e.tipo === 'creado')) {
      historial.unshift({
        _id: `sintetico-creado-${ticket._id}`,
        tipo: 'creado',
        autor: creadoPor,
        createdAt: ticket.createdAt,
        sintetico: true
      })
    }

    const tieneAsignaciones = eventos.some((e) => e.tipo === 'asignado' || e.tipo === 'reasignado')
    if (asignado && !tieneAsignaciones) {
      // Sin autor ni fecha exacta: solo sabemos a quién está asignado hoy
      historial.splice(1, 0, {
        _id: `sintetico-asignado-${ticket._id}`,
        tipo: 'asignado',
        a: String(asignado._id),
        aNombre: asignado.nombre,
        createdAt: null,
        sintetico: true
      })
    }

    res.status(200).json({ eventos: historial })

  } catch (error) {
    next(error)
  }
}
