import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User'
import Brand from '../models/Brand'

// Extendemos la interfaz Request de Express
// para agregarle la propiedad "user" que no existe por defecto
export interface AuthRequest extends Request {
  user?: {
    id: string
    rol: string
    marca?: string
    areas: string[] // solo soporte; vacío para el resto
  }
}

export type UsuarioAutenticado = NonNullable<AuthRequest['user']>

// Valida un access token y relee el usuario de la BD (lo usan el API y el tiempo real).
// Así un usuario desactivado (o un cambio de rol/marca/áreas) aplica aunque su token siga vigente
export const usuarioDesdeToken = async (
  token: string
): Promise<{ ok: true; usuario: UsuarioAutenticado } | { ok: false; mensaje: string }> => {
  let decoded: { id: string }
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string }
  } catch {
    return { ok: false, mensaje: 'No autorizado - token inválido' }
  }

  const user = await User.findById(decoded.id).select('rol estado marca areas')
  if (!user || user.estado === 'inactivo') return { ok: false, mensaje: 'Usuario inactivo o inexistente' }

  if (user.marca) {
    const brand = await Brand.findById(user.marca).select('estado')
    if (!brand || brand.estado === 'inactivo') return { ok: false, mensaje: 'Tu marca está desactivada' }
  }

  // rol, marca y áreas salen de la BD, no del token
  return {
    ok: true,
    usuario: {
      id: String(user._id),
      rol: user.rol,
      marca: user.marca ? String(user.marca) : undefined,
      areas: user.areas.map(String)
    }
  }
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  // El token viene en el header Authorization así: "Bearer eyJhbGciOiJIUzI1NiJ9..."
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'No autorizado - token requerido' })
    return
  }

  try {
    const resultado = await usuarioDesdeToken(authHeader.split(' ')[1])
    if (!resultado.ok) {
      res.status(401).json({ message: resultado.mensaje })
      return
    }

    req.user = resultado.usuario
    // next() le dice a Express que siga al siguiente paso (el controller)
    next()
  } catch (error) {
    next(error)
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
