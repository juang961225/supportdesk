import type { SlaActual } from '../types'
import { colorBarraSla, etiquetaNivelSla, textoSla } from '../utils/sla'

interface SlaBarraProps {
  sla: SlaActual | null | undefined
  // 'detalle': barra con texto · 'tarjeta': línea fina (el texto queda en el tooltip)
  variante?: 'detalle' | 'tarjeta'
}

// Plazo consumido del área actual (tiempo laboral). No se muestra si el ticket está cerrado o no tiene fecha límite
function SlaBarra({ sla, variante = 'detalle' }: SlaBarraProps) {
  if (!sla) return null
  const texto = `${etiquetaNivelSla[sla.nivel]} · ${textoSla(sla)}`

  const barra = (
    <div
      role="progressbar"
      aria-label="Plazo consumido"
      aria-valuenow={sla.porcentaje}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={texto}
      title={texto}
      className={`w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 ${variante === 'tarjeta' ? 'h-1' : 'h-2'}`}
    >
      <div className={`h-full rounded-full ${colorBarraSla[sla.nivel]}`} style={{ width: `${Math.max(sla.porcentaje, 2)}%` }} />
    </div>
  )

  if (variante === 'tarjeta') return <div className="mt-2">{barra}</div>

  return (
    <div className="mt-2">
      {barra}
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {textoSla(sla)} · {sla.porcentaje}% del plazo
      </p>
    </div>
  )
}

export default SlaBarra
