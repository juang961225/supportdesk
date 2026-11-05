import { prioridadLabel } from '../utils/ticketLabels'
import { PRIORIDADES, formatPlazo } from '../utils/plazos'
import type { FormularioPlazos } from '../utils/plazos'
import type { Plazos, Prioridad, UnidadPlazo } from '../types'

interface PlazosEditorProps {
  value: FormularioPlazos
  onChange: (value: FormularioPlazos) => void
  base?: Plazos // si viene, cada fila se puede dejar vacía y usa el plazo de la marca (áreas)
}

const campoClass =
  'border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'

// Un plazo por prioridad: cantidad y unidad
function PlazosEditor({ value, onChange, base }: PlazosEditorProps) {
  const cambiar = (prioridad: Prioridad, cambios: Partial<FormularioPlazos[Prioridad]>) => {
    onChange({ ...value, [prioridad]: { ...value[prioridad], ...cambios } })
  }

  return (
    <div className="space-y-2">
      {PRIORIDADES.map((prioridad) => (
        <div key={prioridad} className="grid grid-cols-[5rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2">
          <label className="text-sm text-gray-700 dark:text-gray-300" htmlFor={`plazo-${prioridad}`}>
            {prioridadLabel[prioridad]}
          </label>
          <input
            id={`plazo-${prioridad}`}
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={value[prioridad].valor}
            placeholder={base ? formatPlazo(base[prioridad]) : undefined}
            onChange={(e) => cambiar(prioridad, { valor: e.target.value })}
            className={`${campoClass} w-full`}
          />
          <select
            aria-label={`Unidad de ${prioridadLabel[prioridad]}`}
            value={value[prioridad].unidad}
            onChange={(e) => cambiar(prioridad, { unidad: e.target.value as UnidadPlazo })}
            className={`${campoClass} w-full`}
          >
            <option value="horas">Horas</option>
            <option value="dias">Días</option>
          </select>
        </div>
      ))}
    </div>
  )
}

export default PlazosEditor
