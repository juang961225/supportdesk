import { Router } from 'express'
import {
  createTicket,
  getTickets,
  getTicketById,
  assignTicket,
  updateTicketStatus,
  getTicketHistory
} from '../controllers/ticketController'
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

// Asignar ticket — solo admin (superadmin es solo lectura)
router.put('/:id/assign', authenticate, authorize('admin'), assignTicket)

// Actualizar estado — soporte (flujo) y usuario (reabrir)
router.put('/:id/status', authenticate, authorize('soporte', 'usuario'), updateTicketStatus)

export default router