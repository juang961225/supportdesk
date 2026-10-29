import { Router } from 'express'
import {
  createTicket,
  getTickets,
  getTicketById,
  assignTicket,
  updateTicketStatus,
  getTicketHistory
} from '../controllers/ticketController'
import { takeTicket, releaseTicket, moveTicket, getTicketRecorrido } from '../controllers/ticketQueueController'
import { addObserver, removeObserver } from '../controllers/ticketObserverController'
import { updateFechaLimite } from '../controllers/ticketDeadlineController'
import { getTicketTramos } from '../controllers/ticketSlaController'
import { exportarTickets } from '../controllers/ticketExportController'
import { authenticate, authorize } from '../middlewares/auth'
import { uploadAdjuntos } from '../services/attachments'
import { validarBody } from '../validacion/validar'
import { esquemaCrearTicket, esquemaAsignar, esquemaMover, esquemaFechaLimite, esquemaEstadoTicket, esquemaObservador } from '../validacion/esquemas'

const router = Router()

// Crear ticket — solo usuarios
router.post('/', authenticate, authorize('usuario'), uploadAdjuntos, validarBody(esquemaCrearTicket), createTicket)

// Listar tickets — todos los roles
router.get('/', authenticate, authorize('superadmin', 'admin', 'soporte', 'usuario'), getTickets)

// Exportar la lista con sus filtros a Excel o PDF — admin y superadmin (antes de /:id)
router.get('/exportar', authenticate, authorize('superadmin', 'admin'), exportarTickets)

// Ver un ticket — todos los roles
router.get('/:id', authenticate, authorize('superadmin', 'admin', 'soporte', 'usuario'), getTicketById)

// Historial interno — admin, soporte y superadmin (solo lectura)
router.get('/:id/history', authenticate, authorize('superadmin', 'admin', 'soporte'), getTicketHistory)

// Tramos por área con tiempo laboral y SLA — mismos roles que el historial
router.get('/:id/tramos', authenticate, authorize('superadmin', 'admin', 'soporte'), getTicketTramos)

// Asignar ticket — admin asigna; el soporte asignado lo pasa a un compañero (superadmin es solo lectura)
router.put('/:id/assign', authenticate, authorize('admin', 'soporte'), validarBody(esquemaAsignar), assignTicket)

// Cola del área — tomar y soltar (soporte), mover de área (admin y soporte), recorrido (todos)
router.post('/:id/take', authenticate, authorize('soporte'), takeTicket)
router.post('/:id/release', authenticate, authorize('soporte'), releaseTicket)
router.put('/:id/move', authenticate, authorize('admin', 'soporte'), validarBody(esquemaMover), moveTicket)
router.get('/:id/recorrido', authenticate, authorize('superadmin', 'admin', 'soporte', 'usuario'), getTicketRecorrido)

// Ajustar la fecha límite — solo el admin de la marca, con motivo (queda en el historial)
router.put('/:id/fecha-limite', authenticate, authorize('admin'), validarBody(esquemaFechaLimite), updateFechaLimite)

// Actualizar estado — soporte (flujo) y usuario (reabrir)
router.put('/:id/status', authenticate, authorize('soporte', 'usuario'), validarBody(esquemaEstadoTicket), updateTicketStatus)

// Observadores — agregan el creador y el admin; el observador puede salirse (lo valida el controller)
router.post('/:id/observers', authenticate, authorize('admin', 'usuario'), validarBody(esquemaObservador), addObserver)
router.delete('/:id/observers/:userId', authenticate, authorize('admin', 'usuario'), removeObserver)

export default router