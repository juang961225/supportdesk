// Lectura de cookies y opciones de la cookie de sesión (funciones puras)

export const COOKIE_REFRESH = 'sd_refresh'
export const RUTA_COOKIE_REFRESH = '/api/auth'

export type SameSite = 'lax' | 'strict' | 'none'

export interface OpcionesCookie {
  httpOnly: true
  secure: boolean
  sameSite: SameSite
  path: string
  maxAge: number // ms
}

// Valor de una cookie del header "Cookie" (sin dependencias extra)
export const leerCookie = (header: string | undefined, nombre: string): string | null => {
  if (!header) return null
  for (const parte of header.split(';')) {
    const igual = parte.indexOf('=')
    if (igual === -1) continue
    if (parte.slice(0, igual).trim() === nombre) {
      const valor = parte.slice(igual + 1).trim()
      try {
        return decodeURIComponent(valor)
      } catch {
        return valor
      }
    }
  }
  return null
}

// SameSite y Secure vienen del .env: en local "lax"; en producción con frontend y API en dominios
// distintos hace falta "none", que el navegador solo acepta con Secure (HTTPS)
export const opcionesCookieRefresh = (
  env: { COOKIE_SAMESITE?: string; COOKIE_SECURE?: string; NODE_ENV?: string },
  maxAge: number
): OpcionesCookie => {
  const pedido = (env.COOKIE_SAMESITE || 'lax').toLowerCase()
  const sameSite: SameSite = pedido === 'none' || pedido === 'strict' ? pedido : 'lax'
  const secure = sameSite === 'none' || env.COOKIE_SECURE === 'true' || env.NODE_ENV === 'production'
  return { httpOnly: true, secure, sameSite, path: RUTA_COOKIE_REFRESH, maxAge }
}
