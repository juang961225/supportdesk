import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { getTickets } from '../../services/ticketService'
import { useToast } from '../../hooks/useToast'
import { useAuth } from '../../hooks/useAuth'
import { prioridadColor, estadoColor } from '../../utils/ticketColors'
import type { Ticket } from '../../types'
import { TicketTimeBadge } from '../../components/TicketTimeBadge'

function UsuarioDashboard() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

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
  }, [])

  // El backend devuelve los que creé y los que sigo como observador
  const misTickets = tickets.filter(t => t.creadoPor._id === user?._id)
  const compartidos = tickets.filter(t => t.creadoPor._id !== user?._id)
  const abiertos = misTickets.filter(t => t.estado !== 'cerrado').length
  const cerrados = misTickets.filter(t => t.estado === 'cerrado').length

  const renderTicket = (ticket: Ticket, mostrarCreador: boolean) => (
    <div
      key={ticket._id}
      className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      onClick={() => navigate(`/usuario/tickets/${ticket._id}`)}
    >
      <div>
        <p className="font-medium text-gray-800 dark:text-white">
          {ticket.titulo}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {mostrarCreador && `${ticket.creadoPor.nombre} · `}{ticket.categoria.nombre}
        </p>
        {ticket.asignadoA && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Atendido por: {ticket.asignadoA.nombre}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <TicketTimeBadge fechaLimite={ticket.fechaLimite} estado={ticket.estado} />
        <span className={`text-xs px-2 py-1 rounded-full ${prioridadColor[ticket.prioridad]}`}>
          {ticket.prioridad}
        </span>
        <span className={`text-xs px-2 py-1 rounded-full ${estadoColor[ticket.estado]}`}>
          {ticket.estado}
        </span>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500 dark:text-gray-400">Cargando...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div>
        <div className="flex items-center justify-between mb-6">
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {misTickets.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No has creado ningún ticket todavía
                </p>
                <button
                  onClick={() => navigate('/usuario/tickets/new')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Crear primer ticket
                </button>
              </div>
            ) : (
              misTickets.map((ticket) => renderTicket(ticket, false))
            )}
          </div>
        </div>

        {/* Tickets de otros que sigo como observador */}
        {compartidos.length > 0 && (
          <>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mt-8 mb-4">
              Compartidos conmigo ({compartidos.length})
            </h3>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {compartidos.map((ticket) => renderTicket(ticket, true))}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}

export default UsuarioDashboard