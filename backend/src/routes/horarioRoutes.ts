import { Router } from 'express'
import { getHorario, getPlazos, updateHorario, updatePlazos } from '../controllers/horarioController'
import { authenticate, authorize } from '../middlewares/auth'
import { validarBody } from '../validacion/validar'
import { esquemaPlazos } from '../validacion/esquemas'

const router = Router()

// Horario laboral de la marca — solo el admin (define fechas límite y SLA)
router.get('/', authenticate, authorize('admin'), getHorario)
router.put('/', authenticate, authorize('admin'), updateHorario)

// Plazos base por prioridad — solo el admin (cada área los puede ajustar en /api/areas)
// El usuario también los lee: al crear un ticket ve cuánto tiempo se promete por prioridad
router.get('/plazos', authenticate, authorize('admin', 'usuario'), getPlazos)
router.put('/plazos', authenticate, authorize('admin'), validarBody(esquemaPlazos), updatePlazos)

export default router
