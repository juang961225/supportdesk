import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { PageSkeleton } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import AssignTicketModal from '../../components/AssignTicketModal'
import { getTickets } from '../../services/ticketService'
import { useToast } from '../../hooks/useToast'
import { useAuth } from '../../hooks/useAuth'
import { prioridadColor, estadoColor } from '../../utils/ticketColors'
import { TicketTimeBadge } from '../../components/TicketTimeBadge'
import type { Ticket } from '../../types'
import { useNavigate } from 'react-router-dom'

function TicketsPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  // Superadmin es solo lectura en tickets
  const canAssign = user?.rol === 'admin'
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // Estado del modal de asignación
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setTickets(await getTickets())
      } catch {
        setError('Error al cargar los datos')
        toast.error('No se pudieron cargar los tickets')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
            {tickets.length} tickets en total
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded mb-4">
            {error}
          </div>
        )}

        {/* Lista de tickets */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {tickets.length === 0 ? (
              <EmptyState
                icon="🎫"
                title="No hay tickets todavía"
                description="Cuando los usuarios de tu marca creen tickets, aparecerán aquí."
              />
            ) : (
                tickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    onClick={() => navigate(`/admin/tickets/${ticket._id}`)}
                    className="p-4 md:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 dark:text-white">
                          {ticket.titulo}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {ticket.creadoPor.nombre} · {ticket.categoria.nombre} · Área: {ticket.area?.nombre ?? 'Sin área'}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {ticket.asignadoA
                            ? `Asignado a: ${ticket.asignadoA.nombre}`
                            : 'Sin asignar'
                          }
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:ml-4">
                        <TicketTimeBadge fechaLimite={ticket.fechaLimite} estado={ticket.estado} />
                        <span className={`text-xs px-2 py-1 rounded-full ${prioridadColor[ticket.prioridad]}`}>
                          {ticket.prioridad}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${estadoColor[ticket.estado]}`}>
                          {ticket.estado}
                        </span>
                        {canAssign && ticket.estado !== 'cerrado' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedTicket(ticket)
                            }}
                            className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            {ticket.asignadoA ? 'Reasignar' : 'Asignar'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
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