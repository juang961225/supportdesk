import { Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import Ticket from '../models/Ticket'
import Area from '../models/Area'
import TicketEvent from '../models/TicketEvent'
import { AuthRequest } from '../middlewares/auth'
import { puedeVerTicket } from '../utils/ticketAccess'
import { puedeTransicionar, aplicarEstado } from '../utils/ticketStatus'
import { fechaLimiteDeMarca } from '../services/horario'
import { registrarEvento } from '../services/ticketEvents'
import { findTicketResponse } from '../services/ticketQueries'

// POST /api/tickets/:id/take — un soporte del área se autoasigna un ticket de la cola → en_progreso
export const takeTicket = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, marca, areas } = req.user!

    const ticket = await Ticket.findOne({ _id: req.params.id, marca })
    if (!ticket) {
      res.status(404).json({ message: 'Ticket no encontrado' })
      return
    }

    if (!ticket.area || !areas.includes(String(ticket.area))) {
      res.status(403).json({ message: 'El ticket no es de tu área' })
      return
    }

    if (ticket.asignadoA) {
      res.status(400).json({ message: 'El ticket ya está asignado' })
      return
    }

    if (ticket.estado === 'cerrado') {
      res.status(400).json({ message: 'No se puede tomar un ticket cerrado' })
      return
    }

    ticket.asignadoA = new mongoose.Types.ObjectId(id)
    const estadoAnterior = ticket.estado
    if (puedeTransicionar(estadoAnterior, 'en_progreso')) aplicarEstado(ticket, 'en_progreso')
    await ticket.save()

    await registrarEvento({
      ticket: ticket._id,
      marca: ticket.marca,
      tipo: 'tomado',
      autor: id,
      de: estadoAnterior,
      a: ticket.estado
    })

    res.status(200).json({ message: 'Ticket tomado', ticket: await findTicketResponse(ticket._id) })

  } catch (error) {
    next(error)
  }
}

// POST /api/tickets/:id/release — el soporte asignado lo suelta → sin asignar, abierto, en la cola de su área
export const releaseTicket = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, marca } = req.user!

    const ticket = await Ticket.findOne({ _id: req.params.id, marca, asignadoA: id })
    if (!ticket) {
      res.status(404).json({ message: 'Ticket no encontrado o no asignado a ti' })
      return
    }

    if (ticket.estado === 'cerrado') {
      res.status(400).json({ message: 'No se puede soltar un ticket cerrado' })
      return
    }

    // Acción de sistema: vuelve a la cola aunque no sea una transición del flujo
    const estadoAnterior = ticket.estado
    ticket.asignadoA = undefined
    ticket.estado = 'abierto'
    await ticket.save()

    await registrarEvento({
      ticket: ticket._id,
      marca: ticket.marca,
      tipo: 'soltado',
      autor: id,
      de: estadoAnterior,
      a: 'abierto'
    })

    res.status(200).json({ message: 'Ticket devuelto a la cola', ticket: await findTicketResponse(ticket._id) })

  } catch (error) {
    next(error)
  }
}

// PUT /api/tickets/:id/move { areaId } — cambia el área conservando la categoría.
// Llega sin asignar y abierto a la cola destino, con nueva fecha límite.
// Pueden moverlo: admin, el soporte asignado o cualquier soporte del área si está en cola.
export const moveTicket = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, rol, marca, areas } = req.user!
    const { areaId } = req.body || {}

    if (!areaId) {
      res.status(400).json({ message: 'El área destino es obligatoria' })
      return
    }

    const ticket = await Ticket.findOne({ _id: req.params.id, marca })
    if (!ticket) {
      res.status(404).json({ message: 'Ticket no encontrado' })
      return
    }

    if (ticket.estado === 'cerrado') {
      res.status(400).json({ message: 'No se puede mover un ticket cerrado' })
      return
    }

    if (rol === 'soporte') {
      const esAsignado = String(ticket.asignadoA) === id
      const enColaDeMiArea = !ticket.asignadoA && ticket.area !== undefined && areas.includes(String(ticket.area))
      if (!esAsignado && !enColaDeMiArea) {
        res.status(403).json({ message: 'Solo puedes mover tickets que tienes asignados o que están en la cola de tu área' })
        return
      }
    }

    if (String(ticket.area) === String(areaId)) {
      res.status(400).json({ message: 'El ticket ya está en esa área' })
      return
    }

    const destino = await Area.findOne({ _id: areaId, marca, activo: true })
    if (!destino) {
      res.status(400).json({ message: 'El área destino no existe, no es de tu marca o está inactiva' })
      return
    }

    const origen = ticket.area ? await Area.findById(ticket.area).select('nombre') : null
    const fechaLimiteAnterior = ticket.fechaLimite

    ticket.area = destino._id
    ticket.asignadoA = undefined
    ticket.estado = 'abierto'
    ticket.fechaLimite = await fechaLimiteDeMarca(ticket.marca, ticket.prioridad)
    await ticket.save()

    await registrarEvento({
      ticket: ticket._id,
      marca: ticket.marca,
      tipo: 'movido',
      autor: id,
      de: origen ? String(origen._id) : undefined,
      deNombre: origen?.nombre,
      a: String(destino._id),
      aNombre: destino.nombre,
      fechaLimiteAnterior
    })

    res.status(200).json({
      message: `Ticket movido a ${destino.nombre}`,
      ticket: await findTicketResponse(ticket._id)
    })

  } catch (error) {
    next(error)
  }
}

// GET /api/tickets/:id/recorrido — por qué áreas pasó el ticket, con fechas y SIN autores
// Visible para cualquiera que pueda ver el ticket (incluido el usuario creador)
export const getTicketRecorrido = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ticket = await Ticket.findById(req.params.id).populate('area', 'nombre')
    if (!ticket) {
      res.status(404).json({ message: 'Ticket no encontrado' })
      return
    }

    if (!puedeVerTicket(req.user!, ticket)) {
      res.status(403).json({ message: 'No tienes acceso a este ticket' })
      return
    }

    const movimientos = await TicketEvent.find({ ticket: ticket._id, tipo: 'movido' })
      .select('deNombre aNombre createdAt')
      .sort({ createdAt: 1 })
      .lean()

    const areaActual = ticket.area as unknown as { nombre: string } | undefined

    // Primer tramo: el área de origen del primer movimiento, o la actual si nunca se movió
    const recorrido = [
      { area: movimientos[0]?.deNombre ?? areaActual?.nombre ?? 'Sin área', desde: ticket.createdAt },
      ...movimientos.map((m) => ({ area: m.aNombre ?? 'Sin área', desde: m.createdAt }))
    ]

    res.status(200).json({ recorrido })

  } catch (error) {
    next(error)
  }
}
