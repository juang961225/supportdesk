import { Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import Comment from '../models/Comment'
import Ticket from '../models/Ticket'
import { AuthRequest } from '../middlewares/auth'
import { puedeVerTicket } from '../utils/ticketAccess'
import { guardarAdjuntos, firmarAdjuntos } from '../services/attachments'
import { storageConfigurado } from '../services/storage'
import { notificar } from '../services/notificaciones'
import { avisarCambioTicket, avisarComentario } from '../services/tiempoReal'
import { reanudarPlazo } from '../services/horario'
import { registrarEvento } from '../services/ticketEvents'
import { aplicarEstado } from '../utils/ticketStatus'
import { comentarioParaRol } from '../utils/privacidadTicket'

// Comentario con sus adjuntos firmados (URL temporal)
const conAdjuntosFirmados = async (comment: InstanceType<typeof Comment>) => ({
  ...comment.toObject(),
  archivos: await firmarAdjuntos(comment.archivos)
})

// POST /api/tickets/:id/comments — agregar comentario (multipart: contenido + archivos opcionales)
export const createComment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const contenido = String(req.body?.contenido || '').trim()
    const files = (req.files as Express.Multer.File[] | undefined) ?? []

    if (!contenido && files.length === 0) {
      res.status(400).json({ message: 'Escribe un comentario o adjunta un archivo' })
      return
    }

    // Las notas internas son solo del equipo
    const interna = req.body?.interna === 'true'
    if (interna && req.user?.rol === 'usuario') {
      res.status(403).json({ message: 'No puedes crear notas internas' })
      return
    }

    if (files.length > 0 && !storageConfigurado()) {
      res.status(503).json({ message: 'El almacenamiento de archivos no está configurado' })
      return
    }

    // Verificar que el ticket existe y el usuario tiene acceso
    const ticket = await Ticket.findById(req.params.id)
    if (!ticket) {
      res.status(404).json({ message: 'Ticket no encontrado' })
      return
    }

    if (!puedeVerTicket(req.user!, ticket)) {
      res.status(403).json({ message: 'No tienes acceso a este ticket' })
      return
    }

    const archivos = await guardarAdjuntos(files, ticket._id)

    const comment = await Comment.create({
      contenido,
      archivos,
      interna,
      ticket: new mongoose.Types.ObjectId(req.params.id as string),
      autor: new mongoose.Types.ObjectId(req.user!.id)
    })

    // El usuario respondió: el ticket vuelve a atención y conserva el tiempo que le quedaba.
    // El soporte se entera por el aviso del comentario
    if (ticket.estado === 'esperando_usuario' && req.user?.rol === 'usuario') {
      const fechaLimiteAnterior = await reanudarPlazo(ticket)
      aplicarEstado(ticket, 'en_progreso')
      await ticket.save()
      await registrarEvento({
        ticket: ticket._id,
        marca: ticket.marca,
        tipo: 'estado',
        autor: req.user.id,
        de: 'esperando_usuario',
        a: 'en_progreso',
        ...(fechaLimiteAnterior && { fechaLimiteAnterior, fechaLimiteNueva: ticket.fechaLimite })
      })
      avisarCambioTicket(ticket._id)
    }

    notificar(ticket._id, req.user!.id, { tipo: 'comentario', contenido, adjuntos: archivos.length, interna })
    avisarComentario(ticket._id)

    // Populate para devolver datos completos
    const commentPopulado = await Comment.findById(comment._id)
      .populate('autor', 'nombre email rol')

    res.status(201).json({
      message: 'Comentario agregado exitosamente',
      comment: commentPopulado ? await conAdjuntosFirmados(commentPopulado) : null
    })

  } catch (error) {
    next(error)
  }
}

// GET /api/tickets/:id/comments — ver historial del ticket
export const getComments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Verificar que el ticket existe
    const ticket = await Ticket.findById(req.params.id).populate<{ area: { _id: mongoose.Types.ObjectId; nombre: string } | null }>('area', 'nombre')
    if (!ticket) {
      res.status(404).json({ message: 'Ticket no encontrado' })
      return
    }

    if (!puedeVerTicket(req.user!, ticket)) {
      res.status(403).json({ message: 'No tienes acceso a este ticket' })
      return
    }

    // El usuario final no recibe las notas internas, ni sus adjuntos
    const comments = await Comment.find({
      ticket: new mongoose.Types.ObjectId(req.params.id as string),
      ...(req.user?.rol === 'usuario' ? { interna: { $ne: true } } : {})
    })
      .populate('autor', 'nombre email rol')
      .sort({ createdAt: 1 }) // más antiguos primero — orden cronológico

    const conAdjuntos = await Promise.all(comments.map(conAdjuntosFirmados))
    res.status(200).json({ comments: conAdjuntos.map((c) => comentarioParaRol(c, req.user?.rol, ticket.area?.nombre)) })

  } catch (error) {
    next(error)
  }
}
