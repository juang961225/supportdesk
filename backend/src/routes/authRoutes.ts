import { Router } from 'express'
import { register, login, refresh, logout } from '../controllers/authController'

const router = Router()

// POST /api/auth/register → ejecuta la función register
router.post('/register', register)

// POST /api/auth/login → ejecuta la función login
router.post('/login', login)

// POST /api/auth/refresh → renueva la sesión con la cookie httpOnly
router.post('/refresh', refresh)

// POST /api/auth/logout → invalida la cookie de sesión
router.post('/logout', logout)

export default router
