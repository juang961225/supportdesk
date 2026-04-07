import { Router } from 'express'
import {
  createTicket,
  getTickets,
  getTicketById,
  assignTicket,
  updateTicketStatus
} from '../controllers/ticketController'
import { authenticate, authorize } from '../middlewares/auth'

const router = Router()

// Crear ticket — solo usuarios
router.post('/', authenticate, authorize('usuario'), createTicket)

// Listar tickets — todos los roles
router.get('/', authenticate, authorize('superadmin', 'admin', 'soporte', 'usuario'), getTickets)

// Ver un ticket — todos los roles
router.get('/:id', authenticate, authorize('superadmin', 'admin', 'soporte', 'usuario'), getTicketById)

// Asignar ticket — solo admin y superadmin
router.put('/:id/assign', authenticate, authorize('admin', 'superadmin'), assignTicket)

// Actualizar estado — solo soporte
router.put('/:id/status', authenticate, authorize('soporte'), updateTicketStatus)

export default router