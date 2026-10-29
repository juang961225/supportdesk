import { Router } from 'express'
import { getAreas, createArea, updateArea, updateAreaEstado, getAreaSoportes } from '../controllers/areaController'
import { authenticate, authorize } from '../middlewares/auth'
import { validarBody } from '../validacion/validar'
import { esquemaArea, esquemaEditarArea, esquemaEstadoArea } from '../validacion/esquemas'

const router = Router()

// Gestión de áreas — admin de la marca; el soporte puede listarlas y ver compañeros
router.get('/', authenticate, authorize('admin', 'soporte'), getAreas)
router.post('/', authenticate, authorize('admin'), validarBody(esquemaArea), createArea)
router.put('/:id', authenticate, authorize('admin'), validarBody(esquemaEditarArea), updateArea)
router.patch('/:id/estado', authenticate, authorize('admin'), validarBody(esquemaEstadoArea), updateAreaEstado)
router.get('/:id/soportes', authenticate, authorize('admin', 'soporte'), getAreaSoportes)

export default router
