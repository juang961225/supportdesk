import { Router } from 'express'
import { register } from '../controllers/authController'

const router = Router()

// POST /api/auth/register → ejecuta la función register
router.post('/register', register)

export default router