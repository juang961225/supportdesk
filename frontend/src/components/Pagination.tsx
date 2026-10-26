import type { Paginacion } from '../types'

interface PaginationProps {
  pagination: Paginacion
  onChange: (page: number) => void
  disabled?: boolean
}

type Item = number | 'gap'

// 1 … 4 5 6 … 20: primera, última y las vecinas de la actual
const paginasVisibles = (actual: number, total: number): Item[] => {
  const paginas = [...new Set([1, actual - 1, actual, actual + 1, total])]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b)

  return paginas.flatMap((p, i): Item[] => (i > 0 && p - paginas[i - 1] > 1 ? ['gap', p] : [p]))
}

const botonBase = 'min-w-9 h-9 px-3 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
const botonNormal = `${botonBase} bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700`
const botonActivo = `${botonBase} bg-blue-600 text-white`

// Paginación numerada; no se muestra si todo cabe en una página
function Pagination({ pagination, onChange, disabled = false }: PaginationProps) {
  const { page, limit, total, totalPages } = pagination
  if (totalPages <= 1) return null

  const desde = (page - 1) * limit + 1
  const hasta = Math.min(page * limit, total)

  const ir = (nueva: number) => {
    onChange(nueva)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <nav className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" aria-label="Paginación">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Mostrando {desde}–{hasta} de {total}
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <button onClick={() => ir(page - 1)} disabled={disabled || page === 1} className={botonNormal}>
          Anterior
        </button>
        {paginasVisibles(page, totalPages).map((item, i) =>
          item === 'gap' ? (
            <span key={`gap-${i}`} className="px-2 text-gray-400">…</span>
          ) : (
            <button
              key={item}
              onClick={() => ir(item)}
              disabled={disabled || item === page}
              aria-current={item === page ? 'page' : undefined}
              className={item === page ? `${botonActivo} disabled:opacity-100` : botonNormal}
            >
              {item}
            </button>
          )
        )}
        <button onClick={() => ir(page + 1)} disabled={disabled || page === totalPages} className={botonNormal}>
          Siguiente
        </button>
      </div>
    </nav>
  )
}

export default Pagination
