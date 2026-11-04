import type { SubMarca } from '../types'

interface SubMarcaSelectorProps {
  submarcas: SubMarca[]
  selected: string[]
  onChange: (selected: string[]) => void
}

// Selección múltiple de sub-marcas para un usuario (solo las activas)
function SubMarcaSelector({ submarcas, selected, onChange }: SubMarcaSelectorProps) {
  const activas = submarcas.filter((s) => s.activo)

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sub-marcas</label>
      {activas.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">No hay sub-marcas activas. Créalas en "Sub-marcas".</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {activas.map((submarca) => {
            const isSelected = selected.includes(submarca._id)
            return (
              <button
                key={submarca._id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggle(submarca._id)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  isSelected
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {submarca.nombre}
              </button>
            )
          })}
        </div>
      )}
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
        El usuario solo podrá crear tickets de estas sub-marcas.
      </p>
    </div>
  )
}

export default SubMarcaSelector
