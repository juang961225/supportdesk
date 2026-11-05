import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { User } from '../types'
import { rolLabel } from '../utils/userLabels'
import type { FiltrosUsuarios } from '../hooks/useFiltrosUsuarios'

const ESPERA_BUSQUEDA_MS = 350
const campo = 'border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'

interface FiltroUsuariosProps {
  filtros: FiltrosUsuarios
  onChange: (clave: keyof FiltrosUsuarios, valor: string) => void
  roles: User['rol'][]
}

function FiltroUsuarios({ filtros, onChange, roles }: FiltroUsuariosProps) {
  const [busqueda, setBusqueda] = useState(filtros.q)

  // La búsqueda se aplica cuando se deja de escribir
  useEffect(() => {
    const texto = busqueda.trim()
    if (texto === filtros.q) return
    const timer = setTimeout(() => onChange('q', texto), ESPERA_BUSQUEDA_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda])

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o correo"
          aria-label="Buscar usuarios"
          maxLength={100}
          className={`${campo} w-full pl-9`}
        />
      </div>
      <select value={filtros.rol} onChange={(e) => onChange('rol', e.target.value)} aria-label="Rol" className={campo}>
        <option value="">Todos los roles</option>
        {roles.map((rol) => (
          <option key={rol} value={rol}>{rolLabel[rol]}</option>
        ))}
      </select>
    </div>
  )
}

export default FiltroUsuarios
