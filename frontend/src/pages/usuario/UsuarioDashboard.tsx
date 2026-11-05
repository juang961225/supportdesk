import { ChevronDown, ChevronRight, Plus, Search, SearchX, Ticket as IconoTicket } from 'lucide-react'
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

const normalizar = (texto: string): string => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function UsuarioDashboard() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [verCerrados, setVerCerrados] = useState(false)
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

  // Mis tickets son pocos: la búsqueda se hace aquí, sin ir al servidor
  const texto = normalizar(busqueda.trim())
  const visibles = texto
    ? tickets.filter((t) => normalizar(`${t.titulo} ${t.descripcion}`).includes(texto))
    : tickets

  // Me toca a mí: soporte espera mi respuesta, o resolvió uno que yo creé y debo confirmarlo
  const esMio = (t: Ticket) => t.creadoPor._id === user?._id
  const meToca = (t: Ticket) => t.estado === 'esperando_usuario' || (t.estado === 'resuelto' && esMio(t))
  const pendientes = visibles.filter(meToca)
  const enCurso = visibles.filter((t) => esMio(t) && t.estado !== 'cerrado' && !meToca(t))
  const cerrados = visibles.filter((t) => esMio(t) && t.estado === 'cerrado')
  // Los de otros que sigo como observador (sin los que me tocan, que ya salen arriba)
  const compartidos = visibles.filter((t) => !esMio(t) && !meToca(t))
    .sort((a, b) => Number(a.estado === 'cerrado') - Number(b.estado === 'cerrado'))

  const totalMios = tickets.filter(esMio)
  const conteo = {
    pendientes: tickets.filter(meToca).length,
    enCurso: totalMios.filter((t) => t.estado !== 'cerrado' && !meToca(t)).length,
    cerrados: totalMios.filter((t) => t.estado === 'cerrado').length,
  }

  const renderTicket = (ticket: Ticket) => (
    <TicketCard
      ticket={ticket}
      variante="usuario"
      mostrarCreador={!esMio(ticket)}
      onClick={() => navigate(`/usuario/tickets/${ticket._id}`)}
    />
  )

  if (isLoading) {
    return (
      <Layout>
        <PageSkeleton variant="lista" stats={3} />
      </Layout>
    )
  }

  const sinNada = tickets.length === 0
  const sinResultados = !sinNada && visibles.length === 0

  return (
    <Layout>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            Mis Tickets
          </h2>
          <button
            onClick={() => navigate('/usuario/tickets/new')}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Nuevo Ticket
          </button>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-lg shadow-sm">
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Necesitan tu respuesta</p>
            <p className={`text-2xl md:text-3xl font-bold mt-1 ${conteo.pendientes > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'}`}>
              {conteo.pendientes}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-lg shadow-sm">
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">En curso</p>
            <p className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">{conteo.enCurso}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 md:p-6 rounded-lg shadow-sm">
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Cerrados</p>
            <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{conteo.cerrados}</p>
          </div>
        </div>

        {sinNada ? (
          <TicketList
            tickets={[]}
            vacio={
              <EmptyState
                icon={IconoTicket}
                title="No has creado ningún ticket todavía"
                description="Cuéntanos qué necesitas y el equipo de soporte te responderá por aquí."
                action={{ label: 'Crear primer ticket', icono: Plus, onClick: () => navigate('/usuario/tickets/new') }}
              />
            }
            renderTicket={renderTicket}
          />
        ) : (
          <>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar en mis tickets"
                aria-label="Buscar en mis tickets"
                maxLength={100}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {sinResultados && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <EmptyState
                  icon={SearchX}
                  title="Ningún ticket coincide con la búsqueda"
                  action={{ label: 'Limpiar búsqueda', onClick: () => setBusqueda('') }}
                />
              </div>
            )}

            {pendientes.length > 0 && (
              <Seccion titulo="Necesitan tu respuesta" cantidad={pendientes.length} destacada>
                <TicketList tickets={pendientes} vacio={null} renderTicket={renderTicket} />
              </Seccion>
            )}

            {enCurso.length > 0 && (
              <Seccion titulo="En curso" cantidad={enCurso.length}>
                <TicketList tickets={enCurso} vacio={null} renderTicket={renderTicket} />
              </Seccion>
            )}

            {compartidos.length > 0 && (
              <Seccion titulo="Compartidos conmigo" cantidad={compartidos.length}>
                <TicketList tickets={compartidos} vacio={null} renderTicket={renderTicket} />
              </Seccion>
            )}

            {/* Los cerrados se pliegan: lo que importa es lo que sigue abierto */}
            {cerrados.length > 0 && (
              <section className="mb-8">
                <button
                  onClick={() => setVerCerrados((v) => !v)}
                  aria-expanded={verCerrados || texto !== ''}
                  className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white mb-4"
                >
                  {verCerrados || texto ? <ChevronDown className="w-5 h-5" aria-hidden="true" /> : <ChevronRight className="w-5 h-5" aria-hidden="true" />}
                  Cerrados ({cerrados.length})
                </button>
                {(verCerrados || texto !== '') && <TicketList tickets={cerrados} vacio={null} renderTicket={renderTicket} />}
              </section>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}

function Seccion({ titulo, cantidad, destacada = false, children }: { titulo: string; cantidad: number; destacada?: boolean; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h3 className={`text-lg font-semibold mb-4 ${destacada ? 'text-amber-700 dark:text-amber-400' : 'text-gray-800 dark:text-white'}`}>
        {titulo} ({cantidad})
      </h3>
      {children}
    </section>
  )
}

export default UsuarioDashboard
