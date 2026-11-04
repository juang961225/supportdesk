import { Router } from 'express'
import { getSubMarcas, createSubMarca, updateSubMarca, updateSubMarcaEstado } from '../controllers/subMarcaController'
import { authenticate, authorize } from '../middlewares/auth'
import { validarBody } from '../validacion/validar'
import { esquemaSubMarca, esquemaEstadoSubMarca } from '../validacion/esquemas'

const router = Router()

// Las administra el admin de la marca; el superadmin solo las ve
router.get('/', authenticate, authorize('superadmin', 'admin', 'soporte', 'usuario'), getSubMarcas)
router.post('/', authenticate, authorize('admin'), validarBody(esquemaSubMarca), createSubMarca)
router.put('/:id', authenticate, authorize('admin'), validarBody(esquemaSubMarca), updateSubMarca)
router.patch('/:id/estado', authenticate, authorize('admin'), validarBody(esquemaEstadoSubMarca), updateSubMarcaEstado)

export default router
