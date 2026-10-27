import { Router } from 'express'
import { getDashboardSummary, getSlaPorArea } from '../controllers/dashboardController'
import { authenticate, authorize } from '../middlewares/auth'

const router = Router()

// Métricas del dashboard — admin (su marca) y superadmin (global)
router.get('/summary', authenticate, authorize('admin', 'superadmin'), getDashboardSummary)
router.get('/sla', authenticate, authorize('admin'), getSlaPorArea)

export default router
