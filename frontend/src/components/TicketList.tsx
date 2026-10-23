import type { TicketCardData } from './TicketCard'

interface TicketListProps<T extends TicketCardData> {
  tickets: T[]
  vacio: React.ReactNode // se muestra cuando no hay tickets (normalmente un <EmptyState />)
  renderTicket: (ticket: T) => React.ReactNode
}

// Contenedor de cards de tickets con divisores y estado vacío
function TicketList<T extends TicketCardData>({ tickets, vacio, renderTicket }: TicketListProps<T>) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm divide-y divide-gray-200 dark:divide-gray-700">
      {tickets.length === 0 ? vacio : tickets.map((ticket) => <div key={ticket._id}>{renderTicket(ticket)}</div>)}
    </div>
  )
}

export default TicketList
