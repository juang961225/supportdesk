interface SkeletonProps {
  className?: string // tamaño y forma (Tailwind), ej. "h-4 w-1/2"
}

// Bloque gris animado que ocupa el lugar del contenido mientras carga
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`} />
}

// Líneas de texto de relleno para secciones pequeñas (comentarios, historial, modales)
export function SkeletonLines({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  )
}

const card = 'bg-white dark:bg-gray-800 rounded-lg shadow-sm'

function ListRows({ count }: { count: number }) {
  return (
    <div className={`${card} divide-y divide-gray-200 dark:divide-gray-700`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="p-6 flex items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}

function StatCards({ count }: { count: number }) {
  return (
    <div className={`grid grid-cols-2 ${count > 2 ? 'lg:grid-cols-4' : ''} gap-4 mb-8`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`${card} p-6 space-y-2`}>
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-8 w-12" />
        </div>
      ))}
    </div>
  )
}

type PageSkeletonVariant = 'lista' | 'dashboard' | 'detalle' | 'formulario'

interface PageSkeletonProps {
  variant: PageSkeletonVariant
  stats?: number // tarjetas de contadores sobre la lista (solo 'lista')
}

// Esqueleto de página completa; va dentro de <Layout> en lugar de "Cargando..."
export function PageSkeleton({ variant, stats = 0 }: PageSkeletonProps) {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-8 w-48 mb-6" />

      {variant === 'lista' && (
        <>
          {stats > 0 && <StatCards count={stats} />}
          <ListRows count={5} />
        </>
      )}

      {variant === 'dashboard' && (
        <>
          <StatCards count={4} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className={`${card} p-4 space-y-3`}>
              <Skeleton className="h-5 w-32" />
              <SkeletonLines count={3} />
            </div>
            <div className={`${card} p-4 space-y-3`}>
              <Skeleton className="h-5 w-32" />
              <SkeletonLines count={3} />
            </div>
          </div>
          <ListRows count={3} />
        </>
      )}

      {variant === 'detalle' && (
        <div className="space-y-6">
          <div className={`${card} p-6 space-y-4`}>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className={`${card} p-6`}>
            <SkeletonLines count={3} />
          </div>
        </div>
      )}

      {variant === 'formulario' && (
        <div className={`${card} p-6 space-y-5 max-w-2xl`}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className={i === 1 ? 'h-24 w-full' : 'h-10 w-full'} />
            </div>
          ))}
          <Skeleton className="h-10 w-32" />
        </div>
      )}
    </div>
  )
}
