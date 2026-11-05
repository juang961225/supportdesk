import { useEffect } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react'
import type { Attachment } from '../types'

interface ImagenAmpliadaProps {
  imagenes: Attachment[]
  indice: number | null // null = cerrada
  onCambiar: (indice: number | null) => void
}

const botonClass = 'p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors'

// Imagen en grande sobre la página, sin abrir otra pestaña. Esc o clic afuera cierran; las flechas cambian de imagen
function ImagenAmpliada({ imagenes, indice, onCambiar }: ImagenAmpliadaProps) {
  const abierta = indice !== null
  const total = imagenes.length

  useEffect(() => {
    if (indice === null) return
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCambiar(null)
      if (e.key === 'ArrowRight') onCambiar((indice + 1) % total)
      if (e.key === 'ArrowLeft') onCambiar((indice - 1 + total) % total)
    }
    document.addEventListener('keydown', alPresionar)
    return () => document.removeEventListener('keydown', alPresionar)
  }, [indice, total, onCambiar])

  if (!abierta) return null
  const imagen = imagenes[indice]
  if (!imagen) return null

  // Los clics en los controles no deben llegar al fondo, que cierra
  const cambiar = (e: React.MouseEvent, destino: number) => {
    e.stopPropagation()
    onCambiar(destino)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={imagen.nombre}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-4"
      onClick={() => onCambiar(null)}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <a
          href={imagen.url}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir el original"
          aria-label="Abrir el original"
          onClick={(e) => e.stopPropagation()}
          className={botonClass}
        >
          <ExternalLink className="w-5 h-5" aria-hidden="true" />
        </a>
        <button type="button" onClick={() => onCambiar(null)} aria-label="Cerrar" className={botonClass}>
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {total > 1 && (
        <>
          <button type="button" onClick={(e) => cambiar(e, (indice - 1 + total) % total)} aria-label="Imagen anterior" className={`${botonClass} absolute left-4`}>
            <ChevronLeft className="w-6 h-6" aria-hidden="true" />
          </button>
          <button type="button" onClick={(e) => cambiar(e, (indice + 1) % total)} aria-label="Imagen siguiente" className={`${botonClass} absolute right-4`}>
            <ChevronRight className="w-6 h-6" aria-hidden="true" />
          </button>
        </>
      )}

      <img
        src={imagen.url}
        alt={imagen.nombre}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[85vh] object-contain rounded"
      />
      <p className="mt-3 text-sm text-white/80 truncate max-w-full">
        {imagen.nombre}{total > 1 ? ` · ${indice + 1} de ${total}` : ''}
      </p>
    </div>
  )
}

export default ImagenAmpliada
