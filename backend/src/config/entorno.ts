// Revisión de las variables de entorno al arrancar (función pura: recibe el entorno y devuelve qué falla).
// Errores → el servidor no arranca. Avisos → arranca, pero conviene corregirlos.

const LARGO_MINIMO_SECRETO = 32

export interface RevisionEntorno {
  errores: string[]
  avisos: string[]
}

export const revisarEntorno = (env: Record<string, string | undefined>): RevisionEntorno => {
  const errores: string[] = []
  const avisos: string[] = []
  const produccion = env.NODE_ENV === 'production'

  if (!env.MONGODB_URI) errores.push('Falta MONGODB_URI')

  if (!env.JWT_SECRET) {
    errores.push('Falta JWT_SECRET')
  } else if (env.JWT_SECRET.length < LARGO_MINIMO_SECRETO) {
    // Un secreto corto permite adivinar la firma y fabricar sesiones: en producción no se acepta
    const mensaje = `JWT_SECRET es demasiado corto (mínimo ${LARGO_MINIMO_SECRETO} caracteres). Genera uno con: openssl rand -hex 32`
    if (produccion) errores.push(mensaje)
    else avisos.push(mensaje)
  }

  if (produccion && !env.FRONTEND_URL) {
    errores.push('Falta FRONTEND_URL: en producción CORS y los enlaces de los emails la necesitan')
  }

  if (produccion && env.COOKIE_SAMESITE === 'none' && env.FRONTEND_URL?.split(',').some((o) => o.trim().startsWith('http://'))) {
    avisos.push('COOKIE_SAMESITE=none exige HTTPS: FRONTEND_URL tiene un origen http://')
  }

  return { errores, avisos }
}
