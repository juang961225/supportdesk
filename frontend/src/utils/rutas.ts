import type { User } from '../types'

// Pantalla de inicio de cada rol
const INICIO_POR_ROL: Record<User['rol'], string> = {
  superadmin: '/superadmin/dashboard',
  admin: '/admin/dashboard',
  soporte: '/soporte/dashboard',
  usuario: '/usuario/dashboard',
}

export const rutaInicio = (rol: User['rol']): string => INICIO_POR_ROL[rol]
