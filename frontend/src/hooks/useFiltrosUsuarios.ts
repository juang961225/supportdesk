import { useSearchParams } from 'react-router-dom'

export interface FiltrosUsuarios {
  q: string
  rol: string
}

// Búsqueda y rol en la URL (?q=&rol=): cambiar uno vuelve a la página 1
export function useFiltrosUsuarios() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filtros: FiltrosUsuarios = { q: searchParams.get('q') ?? '', rol: searchParams.get('rol') ?? '' }
  const setFiltro = (clave: keyof FiltrosUsuarios, valor: string) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      if (valor) params.set(clave, valor)
      else params.delete(clave)
      params.delete('page')
      return params
    }, { replace: true })
  }
  return { filtros, setFiltro, clave: `${filtros.q}|${filtros.rol}` }
}
