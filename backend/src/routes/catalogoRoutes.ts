import { Router } from 'express'
import { getCatalogoContexto, getFiltrosContexto, getMiContexto } from '../controllers/catalogoController'
import { authenticate, authorize } from '../middlewares/auth'

const router = Router()

router.get('/contexto', authenticate, authorize('admin'), getCatalogoContexto)
router.get('/mi-contexto', authenticate, authorize('usuario'), getMiContexto)
router.get('/filtros', authenticate, authorize('superadmin', 'admin', 'soporte'), getFiltrosContexto)

export default router
