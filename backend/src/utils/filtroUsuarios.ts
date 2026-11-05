const ROLES_FILTRABLES = ['superadmin', 'admin', 'soporte', 'usuario']

// ?q busca en nombre o correo (sin distinguir mayúsculas) · ?rol filtra por rol. Valores inválidos se ignoran
export const filtroDeUsuarios = (query: Record<string, unknown>): Record<string, unknown> => {
  const filtro: Record<string, unknown> = {}
  const q = typeof query.q === 'string' ? query.q.trim().slice(0, 100) : ''
  if (q) {
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filtro.$or = [{ nombre: re }, { email: re }]
  }
  if (typeof query.rol === 'string' && ROLES_FILTRABLES.includes(query.rol)) filtro.rol = query.rol
  return filtro
}
