import { useSearchParams } from 'react-router-dom'
import { CLAVES_FILTRO, contarFiltros, filtrosDesdeUrl } from '../utils/ticketFilters'
import type { ClaveFiltroTicket } from '../types'

// Filtros de tickets guardados en la URL. Cambiar uno vuelve a la página 1.
export function useTicketFilters() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filtros = filtrosDesdeUrl(searchParams)

  const actualizar = (cambios: Partial<Record<ClaveFiltroTicket, string>>) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      for (const [clave, valor] of Object.entries(cambios)) {
        if (valor) params.set(clave, valor)
        else params.delete(clave)
      }
      params.delete('page')
      return params
    }, { replace: true })
  }

  const setFiltro = (clave: ClaveFiltroTicket, valor: string) => actualizar({ [clave]: valor })

  const limpiar = () => actualizar(Object.fromEntries(CLAVES_FILTRO.map((clave) => [clave, ''])))

  return {
    filtros,
    setFiltro,
    limpiar,
    hayFiltros: contarFiltros(filtros) > 0,
    clave: CLAVES_FILTRO.map((c) => filtros[c]).join('|'), // cambia cuando cambia cualquier filtro
  }
}
