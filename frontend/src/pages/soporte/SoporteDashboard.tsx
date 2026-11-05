import { Archive, Coffee, Inbox, SearchX, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../../components/Layout'
import { PageSkeleton } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import TicketCard from '../../components/TicketCard'
import TicketList from '../../components/TicketList'
import TicketFilters from '../../components/TicketFilters'
import { getTickets, getTicketsPage } from '../../services/ticketService'
import Pagination from '../../components/Pagination'
import { estaEnPausa } from '../../utils/ticketStatus'
import { getAreas } from '../../services/areaService'
import { getSubMarcas } from '../../services/subMarcaService'
import { getFiltrosContexto } from '../../services/catalogoService'
import type { FiltrosContexto } from '../../types'
import { useTicketFilters } from '../../hooks/useTicketFilters'
import { useToast } from '../../hooks/useToast'
import { useAuth } from '../../hooks/useAuth'
import type { AreaRef, Paginacion, Ticket } from '../../types'
import { useRecargaEnVivo } from '../../hooks/useTiempoReal'

type Vista = 'cola' | 'mios' | 'equipo' | 'cerrados'

const vistas: { id: Vista; label: string; vacio: { icon: LucideIcon; title: string; description: string } }[] = [
  {
    id: 'cola',
    label: 'Cola de mis áreas',
    vacio: { icon: Coffee, title: 'La cola está vacía', description: 'No hay tickets esperando en tus áreas.' },
  },
  {
    id: 'mios',
    label: 'Mis tickets',
    vacio: { icon: Inbox, title: 'No tienes tickets asignados', description: 'Toma uno de la cola de tus áreas para empezar.' },
  },
  {
    id: 'equipo',
    label: 'Del equipo',
    vacio: { icon: Users, title: 'Sin tickets del equipo', description: 'Tus compañeros no tienen tickets abiertos en tus áreas.' },
  },
  {
    id: 'cerrados',
    label: 'Mis cerrados',
    vacio: { icon: Archive, title: 'Aún no has cerrado tickets', description: 'Aquí aparecen los tickets que atendiste, del más reciente al más antiguo.' },
  },
]

const esVista = (valor: string | null): valor is Vista => vistas.some((v) => v.id === valor)

// Orden por urgencia: fecha límite más cercana primero (sin fecha al final)
// Lo que venza primero: el plazo del ticket o el del área
const limiteDe = (t: Ticket): number => Math.min(
  t.fechaLimite ? Date.parse(t.fechaLimite) : Number.MAX_SAFE_INTEGER,
  t.fechaLimiteArea ? Date.parse(t.fechaLimiteArea) : Number.MAX_SAFE_INTEGER
)
const porVencimiento = (a: Ticket, b: Ticket): number => limiteDe(a) - limiteDe(b)
// Mis tickets: primero los que corren (el que vence antes arriba); los detenidos esperando al usuario, al final
const porAtencion = (a: Ticket, b: Ticket): number =>
  Number(estaEnPausa(a.estado)) - Number(estaEnPausa(b.estado)) || porVencimiento(a, b)

function SoporteDashboard() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true) // solo la primera carga (skeleton)
  const [isFetching, setIsFetching] = useState(false)
  // La pestaña va en la URL: al volver de un ticket se queda donde estaba
  const [searchParams, setSearchParams] = useSearchParams()
  const vistaUrl = searchParams.get('vista')
  const vista: Vista = esVista(vistaUrl) ? vistaUrl : 'cola'
  const setVista = (nueva: Vista) => setSearchParams((prev) => {
    const params = new URLSearchParams(prev)
    if (nueva === 'cola') params.delete('vista')
    else params.set('vista', nueva)
    return params
  }, { replace: true })
  const [cerrados, setCerrados] = useState<Ticket[]>([])
  const [paginaCerrados, setPaginaCerrados] = useState(1)
  const [paginacionCerrados, setPaginacionCerrados] = useState<Paginacion | null>(null)
  const [areas, setAreas] = useState<AreaRef[]>()
  const [submarcas, setSubmarcas] = useState<AreaRef[]>()
  const [contexto, setContexto] = useState<FiltrosContexto>()
  const { filtros, setFiltro, limpiar, hayFiltros, clave } = useTicketFilters()
  const enVivo = useRecargaEnVivo() // sube cuando cambia un ticket de mis áreas o asignado a mí
  const navigate = useNavigate()

  // Se recarga cada vez que cambia un filtro (las vistas se reparten aquí, sobre el resultado filtrado)
  useEffect(() => {
    let cancelado = false
    const fetchTickets = async () => {
      setIsFetching(true)
      try {
        // Sin estado elegido, solo activos: los cerrados van en su pestaña, paginados
        const data = await getTickets({ ...filtros, estado: filtros.estado || 'activos' })
        if (!cancelado) setTickets(data)
      } catch {
        if (!cancelado) toast.error('No se pudieron cargar tus tickets')
      } finally {
        if (!cancelado) {
          setIsLoading(false)
          setIsFetching(false)
        }
      }
    }
    fetchTickets()
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, enVivo])

  // Cambiar un filtro vuelve a la primera página de cerrados
  const [claveCerrados, setClaveCerrados] = useState(clave)
  if (claveCerrados !== clave) {
    setClaveCerrados(clave)
    setPaginaCerrados(1)
  }

  // Mis cerrados: solo cuando se abre la pestaña
  useEffect(() => {
    if (vista !== 'cerrados' || !user?._id) return
    let cancelado = false
    getTicketsPage(paginaCerrados, { ...filtros, estado: 'cerrado', asignado: user._id })
      .then(({ items, pagination }) => {
        if (cancelado) return
        setCerrados(items)
        setPaginacionCerrados(pagination)
      })
      .catch(() => {
        if (!cancelado) toast.error('No se pudieron cargar tus tickets cerrados')
      })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, paginaCerrados, clave, enVivo, user?._id])

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const [listaAreas, listaSubmarcas, filtrosContexto] = await Promise.all([getAreas(), getSubMarcas(), getFiltrosContexto()])
        setContexto(filtrosContexto)
        setAreas(listaAreas)
        setSubmarcas(listaSubmarcas)
      } catch {
        toast.error('No se pudieron cargar las opciones de los filtros')
      }
    }
    fetchAreas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // El backend devuelve los tickets de mis áreas + los asignados a mí; aquí se reparten por vista
  const abiertos = tickets.filter(t => t.estado !== 'cerrado')
  const porVista: Record<Vista, Ticket[]> = {
    cola: abiertos.filter(t => !t.asignadoA).sort(porVencimiento), // los que vencen antes, primero
    mios: abiertos.filter(t => t.asignadoA?._id === user?._id).sort(porAtencion),
    equipo: abiertos.filter(t => t.asignadoA && t.asignadoA._id !== user?._id).sort(porVencimiento),
    cerrados,
  }
  const misActivos = porVista.mios.length
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
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            Tickets
          </h2>
          {hayFiltros && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Los números reflejan los filtros activos</p>
          )}
        </div>

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

        <TicketFilters filtros={filtros} onChange={setFiltro} onLimpiar={limpiar} areas={areas} submarcas={submarcas} contexto={contexto} />

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
              {v.label}{v.id === 'cerrados' ? (paginacionCerrados ? ` (${paginacionCerrados.total})` : '') : ` (${porVista[v.id].length})`}
            </button>
          ))}
        </div>

        {/* Lista de la vista actual (se atenúa mientras se aplica un filtro) */}
        <div className={`transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          <TicketList
            tickets={listaActual}
            vacio={hayFiltros ? (
              <EmptyState
                icon={SearchX}
                title="Ningún ticket coincide con los filtros"
                description="Prueba con otros filtros o límpialos para ver todos."
                action={{ label: 'Limpiar filtros', onClick: limpiar }}
              />
            ) : (
              <EmptyState {...(vistas.find(v => v.id === vista) ?? vistas[0]).vacio} />
            )}
            renderTicket={(ticket) => (
              <TicketCard ticket={ticket} onClick={() => navigate(`/soporte/tickets/${ticket._id}`)} />
            )}
          />
        </div>
        {vista === 'cerrados' && paginacionCerrados && (
          <Pagination pagination={paginacionCerrados} onChange={setPaginaCerrados} />
        )}
      </div>
    </Layout>
  )
}

export default SoporteDashboard
