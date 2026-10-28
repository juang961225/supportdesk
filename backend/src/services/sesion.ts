import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import RefreshToken from '../models/RefreshToken'
import User, { IUser } from '../models/User'
import Brand from '../models/Brand'

// Sesión: access token corto (JWT, en memoria del navegador) + refresh token largo (cookie httpOnly) con rotación

// Segundos de vida del access token (15 min). Se puede bajar en .env para probar la renovación (ej. 30)
const accessTokenSegundos = (): number => Number(process.env.ACCESS_TOKEN_SEGUNDOS) || 15 * 60
export const REFRESH_TOKEN_MS = 7 * 24 * 60 * 60 * 1000
const GRACIA_ROTACION_MS = 60 * 1000 // otra pestaña pudo renovar al mismo tiempo

const hash = (token: string): string => crypto.createHash('sha256').update(token).digest('hex')

export const emitirAccessToken = (user: IUser): string =>
  jwt.sign(
    { id: user._id, rol: user.rol, marca: user.marca },
    process.env.JWT_SECRET as string,
    { expiresIn: accessTokenSegundos() }
  )

// Crea un refresh token y devuelve el valor en claro (solo para la cookie)
export const crearRefreshToken = async (usuarioId: mongoose.Types.ObjectId | string): Promise<string> => {
  const token = crypto.randomBytes(48).toString('base64url')
  await RefreshToken.create({ usuario: usuarioId, tokenHash: hash(token), expiraEn: new Date(Date.now() + REFRESH_TOKEN_MS) })
  return token
}

export const revocarTodos = async (usuarioId: mongoose.Types.ObjectId | string): Promise<void> => {
  await RefreshToken.updateMany({ usuario: usuarioId, revocadoEn: { $exists: false } }, { revocadoEn: new Date() })
}

export const revocarRefreshToken = async (token: string): Promise<void> => {
  await RefreshToken.updateOne({ tokenHash: hash(token), revocadoEn: { $exists: false } }, { revocadoEn: new Date() })
}

export type ResultadoRotacion =
  | { ok: true; user: IUser; nuevoToken: string }
  | { ok: false; motivo: 'sin_sesion' | 'rotado' | 'reuso' | 'inactivo' }

// Valida el refresh token, lo revoca y entrega uno nuevo
export const rotarRefreshToken = async (token: string): Promise<ResultadoRotacion> => {
  const guardado = await RefreshToken.findOne({ tokenHash: hash(token) })
  if (!guardado || guardado.expiraEn.getTime() <= Date.now()) return { ok: false, motivo: 'sin_sesion' }

  if (guardado.revocadoEn) {
    // Recién rotado (otra pestaña): no es robo, el frontend reintenta con la cookie nueva
    if (Date.now() - guardado.revocadoEn.getTime() <= GRACIA_ROTACION_MS) return { ok: false, motivo: 'rotado' }
    // Un token viejo reutilizado: posible robo → se cierran todas las sesiones del usuario
    await revocarTodos(guardado.usuario)
    return { ok: false, motivo: 'reuso' }
  }

  // Revocar de forma atómica: si dos peticiones llegan a la vez, solo una gana
  const revocado = await RefreshToken.findOneAndUpdate(
    { _id: guardado._id, revocadoEn: { $exists: false } },
    { revocadoEn: new Date() }
  )
  if (!revocado) return { ok: false, motivo: 'rotado' }

  const user = await User.findById(guardado.usuario)
  if (!user || user.estado === 'inactivo') return { ok: false, motivo: 'inactivo' }
  if (user.marca) {
    const marca = await Brand.findById(user.marca).select('estado')
    if (!marca || marca.estado === 'inactivo') return { ok: false, motivo: 'inactivo' }
  }

  return { ok: true, user, nuevoToken: await crearRefreshToken(user._id) }
}
