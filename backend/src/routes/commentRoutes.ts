import { Router } from 'express'
import { createComment, getComments } from '../controllers/commentController'
import { authenticate, authorize } from '../middlewares/auth'
import { uploadAdjuntos } from '../services/attachments'

const router = Router({ mergeParams: true })
//                      ^^^^^^^^^^^^^^^^^^
// mergeParams es importante — permite acceder a :id del ticket
// que viene de la ruta padre /api/tickets/:id/comments

// multipart/form-data: contenido + hasta 5 archivos en el campo "archivos"
router.post('/', authenticate, authorize('superadmin', 'admin', 'soporte', 'usuario'), uploadAdjuntos, createComment)
router.get('/', authenticate, authorize('superadmin', 'admin', 'soporte', 'usuario'), getComments)

export default router