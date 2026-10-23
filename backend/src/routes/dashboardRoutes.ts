import { Router } from 'express'
import { getDashboardSummary } from '../controllers/dashboardController'
import { authenticate, authorize } from '../middlewares/auth'

const router = Router()

// Métricas del dashboard — admin (su marca) y superadmin (global)
router.get('/summary', authenticate, authorize('admin', 'superadmin'), getDashboardSummary)

export default router
