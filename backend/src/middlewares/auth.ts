import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import User from '../models/User'
import Brand from '../models/Brand'
import { CacheMemoria } from '../services/cacheMemoria'

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

// Lo que se guarda en caché: lo de la petición + nombre y email (los usa la renovación de sesión)
export type UsuarioCargado = UsuarioAutenticado & { nombre: string; email: string }

type ResultadoCarga = { ok: true; usuario: UsuarioCargado } | { ok: false; mensaje: string }

// 15 s: un usuario activo no vuelve a consultarse en cada petición. Editar un usuario o una marca
// desde la app borra su entrada al instante (invalidarSesion / invalidarTodasLasSesiones)
const sesiones = new CacheMemoria<UsuarioCargado>(15 * 1000)

export const invalidarSesion = (usuarioId: string): void => sesiones.borrar(usuarioId)
export const invalidarTodasLasSesiones = (): void => sesiones.limpiar()

interface UsuarioConMarca {
  _id: mongoose.Types.ObjectId
  nombre: string
  email: string
  rol: string
  estado: string
  marca?: mongoose.Types.ObjectId
  areas?: mongoose.Types.ObjectId[]
  marcaEstado: { estado: string }[]
}

// Usuario y estado de su marca en UNA consulta ($lookup), con caché. Solo se cachean los activos:
// así reactivar a alguien aplica de inmediato
export const cargarUsuarioActivo = async (id: string): Promise<ResultadoCarga> => {
  const enCache = sesiones.obtener(id)
  if (enCache) return { ok: true, usuario: enCache }
  if (!mongoose.isValidObjectId(id)) return { ok: false, mensaje: 'Usuario inactivo o inexistente' }

  const [user] = await User.aggregate<UsuarioConMarca>([
    { $match: { _id: new mongoose.Types.ObjectId(id) } },
    { $project: { nombre: 1, email: 1, rol: 1, estado: 1, marca: 1, areas: 1 } },
    { $lookup: { from: Brand.collection.name, localField: 'marca', foreignField: '_id', as: 'marcaEstado', pipeline: [{ $project: { estado: 1 } }] } }
  ])
  if (!user || user.estado === 'inactivo') return { ok: false, mensaje: 'Usuario inactivo o inexistente' }
  if (user.marca && (user.marcaEstado.length === 0 || user.marcaEstado[0].estado === 'inactivo')) {
    return { ok: false, mensaje: 'Tu marca está desactivada' }
  }

  // rol, marca y áreas salen de la BD, no del token
  const usuario: UsuarioCargado = {
    id: String(user._id),
    rol: user.rol,
    marca: user.marca ? String(user.marca) : undefined,
    areas: (user.areas ?? []).map(String),
    nombre: user.nombre,
    email: user.email
  }
  sesiones.guardar(id, usuario)
  return { ok: true, usuario }
}

// Valida un access token y carga el usuario (lo usan el API y el tiempo real).
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

  const resultado = await cargarUsuarioActivo(decoded.id)
  if (!resultado.ok) return resultado
  const { id, rol, marca, areas } = resultado.usuario
  return { ok: true, usuario: { id, rol, marca, areas } }
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
