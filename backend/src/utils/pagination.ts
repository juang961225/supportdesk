export interface PaginacionQuery {
  page: number
  limit: number
  skip: number
}

export interface Paginacion {
  page: number
  limit: number
  total: number
  totalPages: number
}

const LIMIT_POR_DEFECTO = 7 // cabe en pantalla sin scroll
const LIMIT_MAXIMO = 100

const enteroPositivo = (valor: unknown): number | null => {
  const n = Number(valor)
  return Number.isInteger(n) && n > 0 ? n : null
}

// Paginación opcional: sin ?page devuelve null y el endpoint responde la lista completa (selectores, dashboards)
export const leerPaginacion = (query: Record<string, unknown>): PaginacionQuery | null => {
  if (query.page === undefined) return null

  const page = enteroPositivo(query.page) ?? 1
  const limit = Math.min(enteroPositivo(query.limit) ?? LIMIT_POR_DEFECTO, LIMIT_MAXIMO)
  return { page, limit, skip: (page - 1) * limit }
}

export const armarPaginacion = ({ page, limit }: PaginacionQuery, total: number): Paginacion => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
})
