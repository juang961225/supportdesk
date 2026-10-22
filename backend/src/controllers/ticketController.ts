import { Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import Ticket from '../models/Ticket'
import TicketCategory from '../models/TicketCategory'
import User from '../models/User'
import { esEstadoValido, puedeTransicionar, aplicarEstado } from '../utils/ticketStatus'
import { AuthRequest } from '../middlewares/auth'
import { puedeVerTicket } from '../utils/ticketAccess'

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

    ticket.asignadoA = soporte._id
    await ticket.save()

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
    aplicarEstado(ticket, estado)
    await ticket.save()

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
