import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { PageSkeleton } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import TicketCard from '../../components/TicketCard'
import TicketList from '../../components/TicketList'
import { getTickets } from '../../services/ticketService'
import { useToast } from '../../hooks/useToast'
import { useAuth } from '../../hooks/useAuth'
import type { Ticket } from '../../types'
import { useRecargaEnVivo } from '../../hooks/useTiempoReal'

function UsuarioDashboard() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()
  const enVivo = useRecargaEnVivo() // sube cuando cambia alguno de mis tickets

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const data = await getTickets()
        setTickets(data)
      } catch {
        toast.error('No se pudieron cargar tus tickets')
      } finally {
        setIsLoading(false)
      }
    }
    fetchTickets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enVivo])

  // El backend devuelve los que creé y los que sigo como observador
  const misTickets = tickets.filter(t => t.creadoPor._id === user?._id)
  const compartidos = tickets.filter(t => t.creadoPor._id !== user?._id)
  const abiertos = misTickets.filter(t => t.estado !== 'cerrado').length
  const cerrados = misTickets.filter(t => t.estado === 'cerrado').length

  const renderTicket = (ticket: Ticket, mostrarCreador: boolean) => (
    <TicketCard
      ticket={ticket}
      variante="usuario"
      mostrarCreador={mostrarCreador}
      onClick={() => navigate(`/usuario/tickets/${ticket._id}`)}
    />
  )

  if (isLoading) {
    return (
      <Layout>
        <PageSkeleton variant="lista" stats={2} />
      </Layout>
    )
  }

  return (
    <Layout>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            Mis Tickets
          </h2>
          <button
            onClick={() => navigate('/usuario/tickets/new')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Nuevo Ticket
          </button>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">En curso</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {abiertos}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Cerrados</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
              {cerrados}
            </p>
          </div>
        </div>

        {/* Lista de tickets */}
        <TicketList
          tickets={misTickets}
          vacio={
            <EmptyState
              icon="🎫"
              title="No has creado ningún ticket todavía"
              description="Cuéntanos qué necesitas y el equipo de soporte te responderá por aquí."
              action={{ label: 'Crear primer ticket', onClick: () => navigate('/usuario/tickets/new') }}
            />
          }
          renderTicket={(ticket) => renderTicket(ticket, false)}
        />

        {/* Tickets de otros que sigo como observador */}
        {compartidos.length > 0 && (
          <>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mt-8 mb-4">
              Compartidos conmigo ({compartidos.length})
            </h3>
            <TicketList
              tickets={compartidos}
              vacio={null}
              renderTicket={(ticket) => renderTicket(ticket, true)}
            />
          </>
        )}
      </div>
    </Layout>
  )
}

export default UsuarioDashboard