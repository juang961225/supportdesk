import { Router } from 'express'
import { getDashboardSummary, getTendencias } from '../controllers/dashboardController'
import { authenticate, authorize } from '../middlewares/auth'

const router = Router()

// Métricas del dashboard — admin (su marca) y superadmin (global)
router.get('/summary', authenticate, authorize('admin', 'superadmin'), getDashboardSummary)
router.get('/tendencias', authenticate, authorize('admin'), getTendencias)

export default router
