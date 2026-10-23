import { useState, useEffect } from 'react'
import { searchUsers } from '../services/userService'
import type { UserRef } from '../types'

interface ObserverSearchInputProps {
  excludeIds: string[] // creador y observadores actuales
  onSelect: (user: UserRef) => void
  disabled?: boolean
}

const MIN_CARACTERES = 2
const ESPERA_MS = 300 // evita una petición por cada tecla

// Autocompletado de usuarios de la marca por nombre o email para agregarlos como observadores
function ObserverSearchInput({ excludeIds, onSelect, disabled = false }: ObserverSearchInputProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserRef[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const texto = query.trim()
    if (texto.length < MIN_CARACTERES) {
      setResults([])
      return
    }

    let cancelado = false
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const users = await searchUsers(texto)
        if (!cancelado) setResults(users)
      } catch {
        if (!cancelado) setResults([])
      } finally {
        if (!cancelado) setIsSearching(false)
      }
    }, ESPERA_MS)

    return () => {
      cancelado = true
      clearTimeout(timer)
    }
  }, [query])

  const visibles = results.filter((u) => !excludeIds.includes(u._id))
  const mostrarLista = isOpen && query.trim().length >= MIN_CARACTERES

  const handleSelect = (user: UserRef) => {
    onSelect(user)
    setQuery('')
    setResults([])
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') setIsOpen(false)
    // Enter elige el primer resultado y nunca envía el formulario que lo contenga
    if (e.key === 'Enter') {
      e.preventDefault()
      if (visibles.length > 0) handleSelect(visibles[0])
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)} // deja terminar el click en un resultado
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Escribe un nombre o correo..."
        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {mostrarLista && (
        <ul className="absolute z-10 mt-1 w-full max-h-64 overflow-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
          {isSearching && visibles.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Buscando...</li>
          ) : visibles.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Sin resultados en tu marca</li>
          ) : (
            visibles.map((u) => (
              <li key={u._id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()} // mantiene el foco hasta seleccionar
                  onClick={() => handleSelect(u)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <p className="text-sm text-gray-800 dark:text-white">{u.nombre}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

export default ObserverSearchInput
