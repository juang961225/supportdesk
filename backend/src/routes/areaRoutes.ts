import { Router } from 'express'
import { getAreas, createArea, updateArea, updateAreaEstado, getAreaSoportes } from '../controllers/areaController'
import { authenticate, authorize } from '../middlewares/auth'

const router = Router()

// Gestión de áreas — admin de la marca; el soporte puede listarlas y ver compañeros
router.get('/', authenticate, authorize('admin', 'soporte'), getAreas)
router.post('/', authenticate, authorize('admin'), createArea)
router.put('/:id', authenticate, authorize('admin'), updateArea)
router.patch('/:id/estado', authenticate, authorize('admin'), updateAreaEstado)
router.get('/:id/soportes', authenticate, authorize('admin', 'soporte'), getAreaSoportes)

export default router
