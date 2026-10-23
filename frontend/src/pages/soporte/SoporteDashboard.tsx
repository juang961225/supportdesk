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
        <PageSkeleton variant="lista" />
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
        <div className="grid grid-cols-3 gap-2 md:gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-lg shadow-sm">
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">En cola</p>
            <p className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">{porVista.cola.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-lg shadow-sm">
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Mis activos</p>
            <p className="text-2xl md:text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{misActivos}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-lg shadow-sm">
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Del equipo</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-600 dark:text-gray-300 mt-1">{porVista.equipo.length}</p>
          </div>
        </div>

        {/* Pestañas */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {vistas.map((v) => (
            <button
              key={v.id}
              onClick={() => setVista(v.id)}
              className={`text-sm px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
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
        <TicketList
          tickets={listaActual}
          vacio={<EmptyState {...(vistas.find(v => v.id === vista) ?? vistas[0]).vacio} />}
          renderTicket={(ticket) => (
            <TicketCard ticket={ticket} onClick={() => navigate(`/soporte/tickets/${ticket._id}`)} />
          )}
        />
      </div>
    </Layout>
  )
}

export default SoporteDashboard
