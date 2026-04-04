import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

// Extendemos la interfaz Request de Express
// para agregarle la propiedad "user" que no existe por defecto
export interface AuthRequest extends Request {
  user?: {
    id: string
    rol: string
  }
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    // El token viene en el header Authorization así:
    // "Bearer eyJhbGciOiJIUzI1NiJ9..."
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'No autorizado - token requerido' })
      return
    }

    // Extraemos solo el token, sin el "Bearer "
    const token = authHeader.split(' ')[1]

    // Verificamos que el token sea válido y no haya expirado
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string, rol: string }

    // Guardamos los datos del usuario en req para usarlos en el controller
    req.user = decoded

    // next() le dice a Express que siga al siguiente paso (el controller)
    next()

  } catch (error) {
    res.status(401).json({ message: 'No autorizado - token inválido' })
  }
}

// Recibe los roles permitidos y devuelve un middleware
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.rol)) {
      res.status(403).json({ message: 'No tienes permisos para esta acción' })
      return
    }
    next()
  }
}
