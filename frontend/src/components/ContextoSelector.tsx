import { useMemo, useState } from 'react'
import type { CatalogoContexto, ContextoUsuario, Sede, TipoSede } from '../types'

const ORG_MEXICO = 0
const ORG_LATAM = 1
const MAX_RESULTADOS = 30

interface ContextoSelectorProps {
  catalogo: CatalogoContexto
  value: ContextoUsuario
  onChange: (value: ContextoUsuario) => void
}

const etiquetaSede = (sede: Sede): string => (sede.subMarca ? `${sede.nombre} · ${sede.subMarca}` : sede.nombre)

interface GrupoSedesProps {
  titulo: string
  tipo: TipoSede
  todas: boolean
  onTodas: (todas: boolean) => void
  catalogo: CatalogoContexto
  seleccionadas: string[]
  onSeleccion: (claves: string[]) => void
}

// Marcar "todos" o elegir de la lista, que es larga: se busca por nombre
function GrupoSedes({ titulo, tipo, todas, onTodas, catalogo, seleccionadas, onSeleccion }: GrupoSedesProps) {
  const [busqueda, setBusqueda] = useState('')
  const delTipo = useMemo(() => catalogo.sedes.filter((s) => s.tipo === tipo), [catalogo, tipo])
  const texto = busqueda.trim().toLowerCase()
  const resultados = texto
    ? delTipo.filter((s) => !seleccionadas.includes(s.clave) && etiquetaSede(s).toLowerCase().includes(texto)).slice(0, MAX_RESULTADOS)
    : []
  const elegidas = delTipo.filter((s) => seleccionadas.includes(s.clave))

  return (
    <div>
      <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{titulo}</p>
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mb-2">
        <input type="checkbox" checked={todas} onChange={(e) => onTodas(e.target.checked)} />
        Todos (usuario corporativo)
      </label>
      {!todas && (
        <>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre"
            aria-label={`Buscar en ${titulo}`}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {texto && (
            <ul className="mt-1 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded divide-y divide-gray-200 dark:divide-gray-700">
              {resultados.length === 0 ? (
                <li className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">Sin resultados</li>
              ) : resultados.map((sede) => (
                <li key={sede.clave}>
                  <button
                    type="button"
                    onClick={() => onSeleccion([...seleccionadas, sede.clave])}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {etiquetaSede(sede)}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {elegidas.length > 0 && (
            <ul className="flex flex-wrap gap-2 mt-2">
              {elegidas.map((sede) => (
                <li key={sede.clave} className="flex items-center gap-2 text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {etiquetaSede(sede)}
                  <button
                    type="button"
                    onClick={() => onSeleccion(seleccionadas.filter((c) => c !== sede.clave))}
                    aria-label={`Quitar ${etiquetaSede(sede)}`}
                    className="text-red-600 dark:text-red-400 hover:underline"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

// Organización, concesionarios e importadores de un usuario. Clasifica sus tickets; no da permisos
function ContextoSelector({ catalogo, value, onChange }: ContextoSelectorProps) {
  const toggleOrganizacion = (id: number) => {
    const organizaciones = value.organizaciones.includes(id)
      ? value.organizaciones.filter((o) => o !== id)
      : [...value.organizaciones, id]
    onChange({ ...value, organizaciones })
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Organización</p>
        <div className="flex flex-wrap gap-2">
          {catalogo.organizaciones.map((org) => {
            const activa = value.organizaciones.includes(org.id)
            return (
              <button
                key={org.id}
                type="button"
                aria-pressed={activa}
                onClick={() => toggleOrganizacion(org.id)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  activa
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {org.nombre}
              </button>
            )
          })}
        </div>
      </div>

      {value.organizaciones.includes(ORG_MEXICO) && (
        <GrupoSedes
          titulo="Concesionarios"
          tipo="concesionario"
          todas={value.todosConcesionarios}
          onTodas={(todosConcesionarios) => onChange({ ...value, todosConcesionarios })}
          catalogo={catalogo}
          seleccionadas={value.sedes}
          onSeleccion={(sedes) => onChange({ ...value, sedes })}
        />
      )}

      {value.organizaciones.includes(ORG_LATAM) && (
        <GrupoSedes
          titulo="Importadores"
          tipo="importador"
          todas={value.todosImportadores}
          onTodas={(todosImportadores) => onChange({ ...value, todosImportadores })}
          catalogo={catalogo}
          seleccionadas={value.sedes}
          onSeleccion={(sedes) => onChange({ ...value, sedes })}
        />
      )}
    </div>
  )
}

export default ContextoSelector
