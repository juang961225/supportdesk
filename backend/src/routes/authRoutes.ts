import { Router } from 'express'
import { register, login, createUser } from '../controllers/authController'
import { authenticate, authorize } from '../middlewares/auth'

const router = Router()

// POST /api/auth/register → ejecuta la función register
router.post('/register', register)

// POST /api/auth/login → ejecuta la función login
router.post('/login', login)

// superadmin y admin pueden crear usuarios
router.post('/create-user', authenticate, authorize('superadmin', 'admin'), createUser)

export default router