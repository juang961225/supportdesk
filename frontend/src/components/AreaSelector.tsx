import type { Area } from '../types'

interface AreaSelectorProps {
  areas: Area[]
  selected: string[]
  onChange: (selected: string[]) => void
}

// Selección múltiple de áreas para un soporte (solo áreas activas)
function AreaSelector({ areas, selected, onChange }: AreaSelectorProps) {
  const activas = areas.filter((a) => a.activo)

  const toggle = (areaId: string) => {
    onChange(selected.includes(areaId) ? selected.filter((id) => id !== areaId) : [...selected, areaId])
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Áreas</label>
      {activas.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">No hay áreas activas. Créalas en "Áreas".</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {activas.map((area) => {
            const isSelected = selected.includes(area._id)
            return (
              <button
                key={area._id}
                type="button"
                onClick={() => toggle(area._id)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  isSelected
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {area.nombre}
              </button>
            )
          })}
        </div>
      )}
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
        Al quitar un área, sus tickets abiertos en ella vuelven a la cola.
      </p>
    </div>
  )
}

export default AreaSelector
