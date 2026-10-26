import { useState } from 'react'
import Layout from '../../components/Layout'
import { PageSkeleton } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import TicketCard from '../../components/TicketCard'
import TicketList from '../../components/TicketList'
import AssignTicketModal from '../../components/AssignTicketModal'
import { getTicketsPage } from '../../services/ticketService'
import { useToast } from '../../hooks/useToast'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import Pagination from '../../components/Pagination'
import { useAuth } from '../../hooks/useAuth'
import type { Ticket } from '../../types'
import { useNavigate } from 'react-router-dom'

function TicketsPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  // Superadmin es solo lectura en tickets
  const canAssign = user?.rol === 'admin'
  const {
    items: tickets, setItems: setTickets, pagination, setPage, isLoading, isFetching, error
  } = usePaginatedList<Ticket>(getTicketsPage, () => toast.error('No se pudieron cargar los tickets'))
  const navigate = useNavigate()

  // Estado del modal de asignación
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)

  // El modal solo lista soportes activos del área del ticket
  const handleAssigned = (updated: Ticket) => {
    setTickets(tickets.map(t => (t._id === updated._id ? updated : t)))
    setSelectedTicket(null)
  }

  if (isLoading) {
    return (
      <Layout>
        <PageSkeleton variant="lista" />
      </Layout>
    )
  }

  return (
    <Layout>
      <div>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            Tickets
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {pagination?.total ?? tickets.length} tickets en total
          </p>
        </div>

        {/* Lista de tickets */}
        <TicketList
          tickets={tickets}
          vacio={error ? (
            <EmptyState icon="⚠️" title="Error al cargar los tickets" description="Recarga la página para intentarlo de nuevo." />
          ) : (
            <EmptyState
              icon="🎫"
              title="No hay tickets todavía"
              description="Cuando los usuarios de tu marca creen tickets, aparecerán aquí."
            />
          )}
          renderTicket={(ticket) => (
            <TicketCard
              ticket={ticket}
              onClick={() => navigate(`/admin/tickets/${ticket._id}`)}
              acciones={canAssign && ticket.estado !== 'cerrado' && (
                <button
                  onClick={() => setSelectedTicket(ticket)}
                  className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  {ticket.asignadoA ? 'Reasignar' : 'Asignar'}
                </button>
              )}
            />
          )}
        />

        {pagination && <Pagination pagination={pagination} onChange={setPage} disabled={isFetching} />}
      </div>

      {/* Modal de asignación */}
      <AssignTicketModal
        ticket={selectedTicket}
        title={`${selectedTicket?.asignadoA ? 'Reasignar' : 'Asignar'} ticket`}
        onClose={() => setSelectedTicket(null)}
        onAssigned={handleAssigned}
      />
    </Layout>
  )
}

export default TicketsPage