import { useState } from 'react'

export interface FilaTabla {
  etiqueta: string
  valor: string
}

interface ChartCardProps {
  titulo: string
  subtitulo?: string
  // Vista de tabla: la misma información sin depender del color ni del hover
  tabla: { columnaEtiqueta: string; columnaValor: string; filas: FilaTabla[] }
  vacio?: boolean
  className?: string
  children: React.ReactNode
}

const thClass = 'px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase'
const tdClass = 'px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 tabular-nums'

// Tarjeta de gráfica con título y botón para alternar a vista de tabla
function ChartCard({ titulo, subtitulo, tabla, vacio = false, className = '', children }: ChartCardProps) {
  const [verTabla, setVerTabla] = useState(false)

  return (
    <figure className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 ${className}`}>
      <figcaption className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-800 dark:text-white">{titulo}</h4>
          {subtitulo && <p className="text-xs text-gray-400 dark:text-gray-500">{subtitulo}</p>}
        </div>
        {!vacio && (
          <button
            type="button"
            onClick={() => setVerTabla(!verTabla)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
          >
            {verTabla ? 'Ver gráfica' : 'Ver tabla'}
          </button>
        )}
      </figcaption>

      {vacio ? (
        <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Sin datos en este periodo</p>
      ) : verTabla ? (
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={thClass}>{tabla.columnaEtiqueta}</th>
                <th className={`${thClass} text-right`}>{tabla.columnaValor}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {tabla.filas.map((fila) => (
                <tr key={fila.etiqueta}>
                  <td className={tdClass}>{fila.etiqueta}</td>
                  <td className={`${tdClass} text-right`}>{fila.valor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </figure>
  )
}

export default ChartCard
