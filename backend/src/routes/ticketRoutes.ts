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
import { authenticate, authorize } from '../middlewares/auth'

const router = Router()

// Crear ticket — solo usuarios
router.post('/', authenticate, authorize('usuario'), createTicket)

// Listar tickets — todos los roles
router.get('/', authenticate, authorize('superadmin', 'admin', 'soporte', 'usuario'), getTickets)

// Ver un ticket — todos los roles
router.get('/:id', authenticate, authorize('superadmin', 'admin', 'soporte', 'usuario'), getTicketById)

// Historial interno — admin, soporte y superadmin (solo lectura)
router.get('/:id/history', authenticate, authorize('superadmin', 'admin', 'soporte'), getTicketHistory)

// Asignar ticket — admin asigna; el soporte asignado lo pasa a un compañero (superadmin es solo lectura)
router.put('/:id/assign', authenticate, authorize('admin', 'soporte'), assignTicket)

// Cola del área — tomar y soltar (soporte), mover de área (admin y soporte), recorrido (todos)
router.post('/:id/take', authenticate, authorize('soporte'), takeTicket)
router.post('/:id/release', authenticate, authorize('soporte'), releaseTicket)
router.put('/:id/move', authenticate, authorize('admin', 'soporte'), moveTicket)
router.get('/:id/recorrido', authenticate, authorize('superadmin', 'admin', 'soporte', 'usuario'), getTicketRecorrido)

// Actualizar estado — soporte (flujo) y usuario (reabrir)
router.put('/:id/status', authenticate, authorize('soporte', 'usuario'), updateTicketStatus)

export default router