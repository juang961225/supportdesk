import { Pencil } from 'lucide-react'
import type { Ticket } from '../types'

interface TicketSubmarcasProps {
  ticket: Pick<Ticket, 'submarca' | 'submarcasRelacionadas'>
  onCorregir?: () => void // admin y soporte: corregir las relacionadas
}

// Sub-marca principal (la de gráficas, totales y concesionario) y las relacionadas, si hay
function TicketSubmarcas({ ticket, onCorregir }: TicketSubmarcasProps) {
  const relacionadas = ticket.submarcasRelacionadas ?? []
  return (
    <div>
      <p className="text-gray-500 dark:text-gray-400">Sub-marca</p>
      <p className="text-gray-800 dark:text-white font-medium">
        {ticket.submarca?.nombre ?? 'Sin sub-marca'}
        {onCorregir && (
          <button
            onClick={onCorregir}
            className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400 hover:underline"
          >
            <Pencil className="inline w-3 h-3 mr-1" aria-hidden="true" />Relacionadas
          </button>
        )}
      </p>
      {relacionadas.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          También afecta a: {relacionadas.map((s) => s.nombre).join(', ')}
        </p>
      )}
    </div>
  )
}

export default TicketSubmarcas
