import { useEffect, useState } from 'react'
import { estadoLabel, prioridadLabel } from '../utils/ticketLabels'
import { CLAVES_MAS_FILTROS, contarFiltros } from '../utils/ticketFilters'
import type { AreaRef, ClaveFiltroTicket, FiltrosTicket, UserRef } from '../types'

interface Opcion {
  _id: string
  nombre: string
}

interface TicketFiltersProps {
  filtros: FiltrosTicket
  onChange: (clave: ClaveFiltroTicket, valor: string) => void
  onLimpiar: () => void
  // Si no se pasan, ese filtro no se muestra
  areas?: AreaRef[]
  soportes?: UserRef[]
  marcas?: Opcion[]
}

const ESPERA_BUSQUEDA_MS = 300

const campo =
  'border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
const etiqueta = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'

// Barra de filtros de tickets: búsqueda, estado, prioridad y área siempre visibles; el resto en "Más filtros"
function TicketFilters({ filtros, onChange, onLimpiar, areas, soportes, marcas }: TicketFiltersProps) {
  const [busqueda, setBusqueda] = useState(filtros.q)
  // Si la búsqueda cambia desde fuera (ej. "Limpiar filtros" del estado vacío), el input la sigue
  const [qAplicado, setQAplicado] = useState(filtros.q)
  if (filtros.q !== qAplicado) {
    setQAplicado(filtros.q)
    if (filtros.q !== busqueda.trim()) setBusqueda(filtros.q)
  }
  const activosEnMas = contarFiltros(filtros, CLAVES_MAS_FILTROS)
  const [masAbierto, setMasAbierto] = useState(activosEnMas > 0)
  const hayFiltros = busqueda.trim() !== '' || Object.values(filtros).some(Boolean)

  // La búsqueda se aplica cuando se deja de escribir
  useEffect(() => {
    const texto = busqueda.trim()
    if (texto === filtros.q) return
    const timer = setTimeout(() => onChange('q', texto), ESPERA_BUSQUEDA_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda])

  const handleLimpiar = () => {
    setBusqueda('')
    onLimpiar()
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar en título o descripción"
          aria-label="Buscar tickets"
          maxLength={100}
          className={`${campo} sm:col-span-2 lg:col-span-1`}
        />
        <select value={filtros.estado} onChange={(e) => onChange('estado', e.target.value)} aria-label="Estado" className={campo}>
          <option value="">Todos los estados</option>
          <option value="activos">Activos (sin cerrados)</option>
          {Object.entries(estadoLabel).map(([valor, label]) => (
            <option key={valor} value={valor}>{label}</option>
          ))}
        </select>
        <select value={filtros.prioridad} onChange={(e) => onChange('prioridad', e.target.value)} aria-label="Prioridad" className={campo}>
          <option value="">Todas las prioridades</option>
          {Object.entries(prioridadLabel).map(([valor, label]) => (
            <option key={valor} value={valor}>{label}</option>
          ))}
        </select>
        {areas && (
          <select value={filtros.area} onChange={(e) => onChange('area', e.target.value)} aria-label="Área" className={campo}>
            <option value="">Todas las áreas</option>
            {areas.map((a) => (
              <option key={a._id} value={a._id}>{a.nombre}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
        <button
          type="button"
          onClick={() => setMasAbierto(!masAbierto)}
          aria-expanded={masAbierto}
          className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
        >
          ⚙ Más filtros{activosEnMas > 0 ? ` (${activosEnMas})` : ''} {masAbierto ? '▴' : '▾'}
        </button>
        {hayFiltros && (
          <button type="button" onClick={handleLimpiar} className="text-sm text-red-600 dark:text-red-400 hover:underline">
            Limpiar filtros
          </button>
        )}
      </div>

      {masAbierto && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          {marcas && (
            <div>
              <label className={etiqueta} htmlFor="filtro-marca">Marca</label>
              <select id="filtro-marca" value={filtros.marca} onChange={(e) => onChange('marca', e.target.value)} className={`${campo} w-full`}>
                <option value="">Todas las marcas</option>
                {marcas.map((m) => (
                  <option key={m._id} value={m._id}>{m.nombre}</option>
                ))}
              </select>
            </div>
          )}
          {soportes && (
            <div>
              <label className={etiqueta} htmlFor="filtro-asignado">Asignado a</label>
              <select id="filtro-asignado" value={filtros.asignado} onChange={(e) => onChange('asignado', e.target.value)} className={`${campo} w-full`}>
                <option value="">Cualquiera</option>
                <option value="sin_asignar">Sin asignar</option>
                {soportes.map((s) => (
                  <option key={s._id} value={s._id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className={etiqueta} htmlFor="filtro-vencimiento">Vencimiento</label>
            <select id="filtro-vencimiento" value={filtros.vencimiento} onChange={(e) => onChange('vencimiento', e.target.value)} className={`${campo} w-full`}>
              <option value="">Todos</option>
              <option value="vencidos">Vencidos</option>
              <option value="pronto">Vencen en 24 h</option>
            </select>
          </div>
          <div>
            <label className={etiqueta} htmlFor="filtro-desde">Creado desde</label>
            <input
              id="filtro-desde"
              type="date"
              value={filtros.desde}
              max={filtros.hasta || undefined}
              onChange={(e) => onChange('desde', e.target.value)}
              className={`${campo} w-full`}
            />
          </div>
          <div>
            <label className={etiqueta} htmlFor="filtro-hasta">Creado hasta</label>
            <input
              id="filtro-hasta"
              type="date"
              value={filtros.hasta}
              min={filtros.desde || undefined}
              onChange={(e) => onChange('hasta', e.target.value)}
              className={`${campo} w-full`}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default TicketFilters
