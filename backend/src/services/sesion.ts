import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import RefreshToken from '../models/RefreshToken'
import { cargarUsuarioActivo, UsuarioCargado } from '../middlewares/auth'

// Sesión: access token corto (JWT, en memoria del navegador) + refresh token largo (cookie httpOnly) con rotación

// Segundos de vida del access token (15 min). Se puede bajar en .env para probar la renovación (ej. 30)
const accessTokenSegundos = (): number => Number(process.env.ACCESS_TOKEN_SEGUNDOS) || 15 * 60
export const REFRESH_TOKEN_MS = 7 * 24 * 60 * 60 * 1000
const GRACIA_ROTACION_MS = 60 * 1000 // otra pestaña pudo renovar al mismo tiempo

const hash = (token: string): string => crypto.createHash('sha256').update(token).digest('hex')

export const emitirAccessToken = (user: { id: string; rol: string; marca?: string }): string =>
  jwt.sign(
    { id: user.id, rol: user.rol, marca: user.marca },
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
  | { ok: true; user: UsuarioCargado; nuevoToken: string }
  | { ok: false; motivo: 'sin_sesion' | 'rotado' | 'reuso' | 'inactivo' }

// Valida el refresh token, lo revoca y entrega uno nuevo.
// Camino normal en 2-3 viajes a la base: revocar (atómico) → usuario (suele estar en caché) → crear el nuevo
export const rotarRefreshToken = async (token: string): Promise<ResultadoRotacion> => {
  const ahora = new Date()
  // Revocar de forma atómica solo si sigue vigente: si dos peticiones llegan a la vez, solo una gana
  const vigente = await RefreshToken.findOneAndUpdate(
    { tokenHash: hash(token), revocadoEn: { $exists: false }, expiraEn: { $gt: ahora } },
    { revocadoEn: ahora }
  )

  if (!vigente) {
    // Solo si falló se averigua por qué (camino poco frecuente)
    const guardado = await RefreshToken.findOne({ tokenHash: hash(token) })
    if (!guardado || !guardado.revocadoEn || guardado.expiraEn.getTime() <= Date.now()) return { ok: false, motivo: 'sin_sesion' }
    // Recién rotado (otra pestaña): no es robo, el frontend reintenta con la cookie nueva
    if (Date.now() - guardado.revocadoEn.getTime() <= GRACIA_ROTACION_MS) return { ok: false, motivo: 'rotado' }
    // Un token viejo reutilizado: posible robo → se cierran todas las sesiones del usuario
    await revocarTodos(guardado.usuario)
    return { ok: false, motivo: 'reuso' }
  }

  const resultado = await cargarUsuarioActivo(String(vigente.usuario))
  if (!resultado.ok) return { ok: false, motivo: 'inactivo' }

  return { ok: true, user: resultado.usuario, nuevoToken: await crearRefreshToken(resultado.usuario.id) }
}
