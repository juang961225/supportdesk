import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Diálogo accesible: se cierra con Esc, la X o Cancelar (no con un clic fuera, para no perder lo escrito).
// El foco entra al abrir, Tab no se escapa del diálogo y al cerrar vuelve a donde estaba
function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const tituloId = useId()
  const contenedor = useRef<HTMLDivElement>(null)
  const alCerrar = useRef(onClose)
  useEffect(() => {
    alCerrar.current = onClose
  })

  useEffect(() => {
    if (!isOpen) return
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const caja = contenedor.current

    // Si nada dentro pidió el foco (autoFocus), va al primer campo o botón
    if (caja && !caja.contains(document.activeElement)) {
      const primero = [...caja.querySelectorAll<HTMLElement>(ENFOCABLES)].find((el) => el.getAttribute('aria-label') !== 'Cerrar')
      ;(primero ?? caja).focus()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        alCerrar.current()
        return
      }
      if (e.key !== 'Tab' || !caja) return
      const enfocables = [...caja.querySelectorAll<HTMLElement>(ENFOCABLES)]
      if (enfocables.length === 0) return
      const [primero, ultimo] = [enfocables[0], enfocables[enfocables.length - 1]]
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      anterior?.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    // Fondo oscuro detrás del modal
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div
        ref={contenedor}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 transition-colors focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 id={tituloId} className="text-lg font-semibold text-gray-800 dark:text-white">
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Contenido — viene de children */}
        {children}
      </div>
    </div>
  )
}

export default Modal
