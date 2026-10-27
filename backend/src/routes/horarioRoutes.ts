import { Router } from 'express'
import { getHorario, updateHorario } from '../controllers/horarioController'
import { authenticate, authorize } from '../middlewares/auth'

const router = Router()

// Horario laboral de la marca — solo el admin (define fechas límite y SLA)
router.get('/', authenticate, authorize('admin'), getHorario)
router.put('/', authenticate, authorize('admin'), updateHorario)

export default router
