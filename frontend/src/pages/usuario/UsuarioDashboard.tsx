import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { getTickets } from '../../services/ticketService'
import type { Ticket } from '../../types'

const prioridadColor: Record<string, string> = {
  critica: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  alta: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  media: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  baja: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
}

const estadoColor: Record<string, string> = {
  abierto: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  en_progreso: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  en_revision: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  cerrado: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  reabierto: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
}

function UsuarioDashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const data = await getTickets()
        setTickets(data)
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchTickets()
  }, [])

  const abiertos = tickets.filter(t => t.estado !== 'cerrado').length
  const cerrados = tickets.filter(t => t.estado === 'cerrado').length

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
            {tickets.length === 0 ? (
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
              tickets.map((ticket) => (
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
                      {ticket.categoria.nombre}
                    </p>
                    {ticket.asignadoA && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Atendido por: {ticket.asignadoA.nombre}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${prioridadColor[ticket.prioridad]}`}>
                      {ticket.prioridad}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${estadoColor[ticket.estado]}`}>
                      {ticket.estado}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default UsuarioDashboard