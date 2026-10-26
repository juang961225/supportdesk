import type { User } from '../types'

// Etiquetas legibles para roles y estados de cuenta (usuarios y marcas)
export const rolLabel: Record<User['rol'], string> = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  soporte: 'Soporte',
  usuario: 'Usuario',
}

export const cuentaEstadoLabel: Record<'activo' | 'inactivo', string> = {
  activo: 'Activo',
  inactivo: 'Inactivo',
}
