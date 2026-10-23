import { Router } from 'express'
import { getUsers, createUser, updateUser, searchUsers } from '../controllers/userController'
import { authenticate, authorize } from '../middlewares/auth'

const router = Router()

// Gestión de usuarios — superadmin y admin (el controller aplica los límites de cada uno)
router.get('/', authenticate, authorize('superadmin', 'admin'), getUsers)
// Autocompletado de usuarios de la marca para agregar observadores (usuario creador y admin)
router.get('/search', authenticate, authorize('usuario', 'admin'), searchUsers)
router.post('/', authenticate, authorize('superadmin', 'admin'), createUser)
router.patch('/:id', authenticate, authorize('superadmin', 'admin'), updateUser)

export default router
