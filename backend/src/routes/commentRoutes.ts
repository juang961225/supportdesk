import { Router } from 'express'
import { createComment, getComments } from '../controllers/commentController'
import { authenticate, authorize } from '../middlewares/auth'

const router = Router({ mergeParams: true })
//                      ^^^^^^^^^^^^^^^^^^
// mergeParams es importante — permite acceder a :id del ticket
// que viene de la ruta padre /api/tickets/:id/comments

router.post('/', authenticate, authorize('superadmin', 'admin', 'soporte', 'usuario'), createComment)
router.get('/', authenticate, authorize('superadmin', 'admin', 'soporte', 'usuario'), getComments)

export default router