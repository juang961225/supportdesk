import { ArrowLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { botonPrincipal } from './PaginaEstado'

// "Volver" regresa a donde estaba (con su pestaña y filtros); si se abrió el enlace directo, va a la lista
export function BotonVolver({ destino }: { destino: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const hayHistorial = location.key !== 'default'
  return (
    <button
      onClick={() => (hayHistorial ? navigate(-1) : navigate(destino))}
      className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-6 flex items-center gap-1"
    >
      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
      Volver
    </button>
  )
}

// El ticket no existe o ya no se tiene acceso (p. ej., dejó de seguirlo)
export function TicketNoEncontrado({ destino }: { destino: string }) {
  const navigate = useNavigate()
  return (
    <div className="max-w-md mx-auto text-center py-16">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Ticket no encontrado</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Puede que el enlace esté mal o que ya no tengas acceso a este ticket.
      </p>
      <button onClick={() => navigate(destino)} className={botonPrincipal}>
        Ir a la lista de tickets
      </button>
    </div>
  )
}
