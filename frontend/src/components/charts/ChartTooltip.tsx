// Solo lo que se usa del tooltip de Recharts (sin depender de sus genéricos)
interface ChartTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ value?: unknown; payload?: { etiqueta?: unknown } }>
  label?: unknown
  formatoValor: (valor: number) => string
  formatoEtiqueta?: (etiqueta: string) => string
}

// Tooltip común: el valor manda (fuerte) y la etiqueta acompaña; clave de línea con el color de la serie
function ChartTooltip({ active, payload, label, formatoValor, formatoEtiqueta }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  const etiqueta = String(item.payload?.etiqueta ?? label ?? '')

  return (
    <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-sm">
      <p className="text-xs text-gray-500 dark:text-gray-400">{formatoEtiqueta ? formatoEtiqueta(etiqueta) : etiqueta}</p>
      <p className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
        <span className="inline-block h-0.5 w-3 rounded" style={{ background: 'var(--chart-serie)' }} aria-hidden="true" />
        {formatoValor(Number(item.value ?? 0))}
      </p>
    </div>
  )
}

export default ChartTooltip
