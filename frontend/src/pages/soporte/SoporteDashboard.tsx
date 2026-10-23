import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import EmptyState from '../../components/EmptyState'
import { getTickets } from '../../services/ticketService'
import { useToast } from '../../hooks/useToast'
import { useAuth } from '../../hooks/useAuth'
import { prioridadColor, estadoColor } from '../../utils/ticketColors'
import type { Ticket } from '../../types'
import { TicketTimeBadge } from '../../components/TicketTimeBadge'

type Vista = 'cola' | 'mios' | 'equipo'

const vistas: { id: Vista; label: string; vacio: { icon: string; title: string; description: string } }[] = [
  {
    id: 'cola',
    label: 'Cola de mis áreas',
    vacio: { icon: '☕', title: 'La cola está vacía', description: 'No hay tickets esperando en tus áreas.' },
  },
  {
    id: 'mios',
    label: 'Mis tickets',
    vacio: { icon: '🙌', title: 'No tienes tickets asignados', description: 'Toma uno de la cola de tus áreas para empezar.' },
  },
  {
    id: 'equipo',
    label: 'Del equipo',
    vacio: { icon: '👥', title: 'Sin tickets del equipo', description: 'Tus compañeros no tienen tickets abiertos en tus áreas.' },
  },
]

function SoporteDashboard() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [vista, setVista] = useState<Vista>('cola')
  const navigate = useNavigate()

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setTickets(await getTickets())
      } catch {
        toast.error('No se pudieron cargar tus tickets')
      } finally {
        setIsLoading(false)
      }
    }
    fetchTickets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // El backend devuelve los tickets de mis áreas + los asignados a mí; aquí se reparten por vista
  const abiertos = tickets.filter(t => t.estado !== 'cerrado')
  const porVista: Record<Vista, Ticket[]> = {
    cola: abiertos.filter(t => !t.asignadoA),
    mios: tickets.filter(t => t.asignadoA?._id === user?._id),
    equipo: abiertos.filter(t => t.asignadoA && t.asignadoA._id !== user?._id),
  }
  const misActivos = porVista.mios.filter(t => t.estado !== 'cerrado').length
  const listaActual = porVista[vista]

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
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
          Tickets
        </h2>

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">En cola</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">{porVista.cola.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Mis activos</p>
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{misActivos}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Del equipo</p>
            <p className="text-3xl font-bold text-gray-600 dark:text-gray-300 mt-1">{porVista.equipo.length}</p>
          </div>
        </div>

        {/* Pestañas */}
        <div className="flex gap-2 mb-4">
          {vistas.map((v) => (
            <button
              key={v.id}
              onClick={() => setVista(v.id)}
              className={`text-sm px-4 py-2 rounded-lg transition-colors ${
                vista === v.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {v.label} ({porVista[v.id].length})
            </button>
          ))}
        </div>

        {/* Lista de la vista actual */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {listaActual.length === 0 ? (
              <EmptyState {...(vistas.find(v => v.id === vista) ?? vistas[0]).vacio} />
            ) : (
              listaActual.map((ticket) => (
                <div
                  key={ticket._id}
                  className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => navigate(`/soporte/tickets/${ticket._id}`)}
                >
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">
                      {ticket.titulo}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {ticket.creadoPor.nombre} · {ticket.categoria.nombre} · Área: {ticket.area?.nombre ?? 'Sin área'}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {ticket.asignadoA ? `Atiende: ${ticket.asignadoA.nombre}` : 'Sin asignar'}
                      {ticket.fechaLimite && ` · Límite: ${new Date(ticket.fechaLimite).toLocaleDateString()}`}
                    </p>
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
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default SoporteDashboard
