import { Router } from 'express'
import { register, login } from '../controllers/authController'

const router = Router()

// POST /api/auth/register → ejecuta la función register
router.post('/register', register)

// POST /api/auth/login → ejecuta la función login
router.post('/login', login)

export default router