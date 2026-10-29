import { Request } from 'express'
import { rateLimit, ipKeyGenerator } from 'express-rate-limit'

// Límites de intentos contra fuerza bruta. En memoria del proceso (un solo servidor);
// con varias instancias habría que usar un almacén compartido (ej. Redis).
// Detrás de un proxy (producción) hay que configurar TRUST_PROXY para que la IP sea la del cliente.

const QUINCE_MIN = 15 * 60 * 1000

const mensaje = (texto: string) => ({ message: texto })

// Por IP: frena a quien prueba muchas cuentas o contraseñas desde el mismo lugar
export const limiteLoginPorIp = rateLimit({
  windowMs: QUINCE_MIN,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: mensaje('Demasiados intentos de inicio de sesión. Espera unos minutos e inténtalo de nuevo.')
})

const emailDe = (req: Request): string | null => {
  const email: unknown = req.body?.email
  return typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null
}

// Por cuenta: solo cuentan los intentos fallidos; protege una cuenta aunque el atacante cambie de IP
export const limiteLoginPorCuenta = rateLimit({
  windowMs: QUINCE_MIN,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => emailDe(req) ?? ipKeyGenerator(req.ip ?? ''),
  message: mensaje('Demasiados intentos fallidos con esta cuenta. Espera 15 minutos o contacta al administrador.')
})

// Renovación de sesión: generoso (varias pestañas), pero acota abusos con cookies robadas
export const limiteRefresh = rateLimit({
  windowMs: QUINCE_MIN,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: mensaje('Demasiadas renovaciones de sesión. Espera unos minutos.')
})
