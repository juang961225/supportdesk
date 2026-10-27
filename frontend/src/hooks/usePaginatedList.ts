import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Paginacion, Paginado } from '../types'

// Lista paginada con la página en la URL (?page=N): carga, error y recarga.
// onError se llama si falla la carga (normalmente un toast).
// clave: cambia cuando cambian los filtros de la consulta y fuerza una recarga.
export function usePaginatedList<T>(
  fetchPage: (page: number) => Promise<Paginado<T>>,
  onError: () => void,
  clave = ''
) {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(Math.floor(Number(searchParams.get('page'))) || 1, 1)

  const [items, setItems] = useState<T[]>([])
  const [pagination, setPagination] = useState<Paginacion | null>(null)
  const [isLoading, setIsLoading] = useState(true) // solo la primera carga (skeleton)
  const [isFetching, setIsFetching] = useState(false) // cualquier carga (deshabilita la paginación)
  const [error, setError] = useState(false)
  const [version, setVersion] = useState(0) // subirla fuerza una recarga de la página actual

  // Conserva los demás parámetros de la URL (filtros futuros)
  const setPage = (nueva: number, replace = false) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      if (nueva <= 1) params.delete('page')
      else params.set('page', String(nueva))
      return params
    }, { replace })
  }

  useEffect(() => {
    let cancelado = false
    const cargar = async () => {
      setIsFetching(true)
      try {
        const data = await fetchPage(page)
        if (cancelado) return
        // La URL apunta a una página que ya no existe → ir a la última
        if (data.items.length === 0 && page > 1 && data.pagination.totalPages > 0) {
          setPage(data.pagination.totalPages, true)
          return
        }
        setItems(data.items)
        setPagination(data.pagination)
        setError(false)
      } catch {
        if (!cancelado) {
          setError(true)
          onError()
        }
      } finally {
        if (!cancelado) {
          setIsLoading(false)
          setIsFetching(false)
        }
      }
    }
    cargar()
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, version, clave])

  // Recarga la página actual (ej. después de editar)
  const recargar = () => setVersion((v) => v + 1)

  // Tras crear: el elemento nuevo queda en la página 1
  const recargarDesdeInicio = () => {
    if (page === 1) recargar()
    else setPage(1)
  }

  return { items, setItems, pagination, page, setPage, isLoading, isFetching, error, recargar, recargarDesdeInicio }
}
