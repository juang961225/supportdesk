import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { PageSkeleton } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import TicketCard from '../../components/TicketCard'
import TicketList from '../../components/TicketList'
import AssignTicketModal from '../../components/AssignTicketModal'
import TicketFilters from '../../components/TicketFilters'
import { getTicketsPage } from '../../services/ticketService'
import { getAreas } from '../../services/areaService'
import { getUsers } from '../../services/userService'
import { getBrands } from '../../services/brandService'
import { useTicketFilters } from '../../hooks/useTicketFilters'
import { useToast } from '../../hooks/useToast'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import Pagination from '../../components/Pagination'
import { useAuth } from '../../hooks/useAuth'
import type { AreaRef, Brand, Ticket, UserRef } from '../../types'
import { useNavigate } from 'react-router-dom'

function TicketsPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  // Superadmin es solo lectura en tickets
  const canAssign = user?.rol === 'admin'
  const esSuperadmin = user?.rol === 'superadmin'
  const { filtros, setFiltro, limpiar, hayFiltros, clave } = useTicketFilters()
  const {
    items: tickets, setItems: setTickets, pagination, setPage, isLoading, isFetching, error
  } = usePaginatedList<Ticket>(
    (page) => getTicketsPage(page, filtros),
    () => toast.error('No se pudieron cargar los tickets'),
    clave
  )
  const navigate = useNavigate()

  // Opciones de los filtros: admin filtra por área y asignado; superadmin por marca
  const [areas, setAreas] = useState<AreaRef[]>()
  const [soportes, setSoportes] = useState<UserRef[]>()
  const [marcas, setMarcas] = useState<Brand[]>()

  useEffect(() => {
    const cargarOpciones = async () => {
      try {
        if (esSuperadmin) {
          setMarcas(await getBrands())
        } else {
          const [listaAreas, usuarios] = await Promise.all([getAreas(), getUsers()])
          setAreas(listaAreas)
          setSoportes(usuarios.filter(u => u.rol === 'soporte'))
        }
      } catch {
        toast.error('No se pudieron cargar las opciones de los filtros')
      }
    }
    cargarOpciones()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
            {pagination?.total ?? tickets.length} {hayFiltros ? 'tickets encontrados' : 'tickets en total'}
          </p>
        </div>

        <TicketFilters
          filtros={filtros}
          onChange={setFiltro}
          onLimpiar={limpiar}
          areas={areas}
          soportes={soportes}
          marcas={marcas}
        />

        {/* Lista de tickets (se atenúa mientras carga otra página o filtro) */}
        <div className={`transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          <TicketList
            tickets={tickets}
            vacio={error ? (
              <EmptyState icon="⚠️" title="Error al cargar los tickets" description="Recarga la página para intentarlo de nuevo." />
            ) : hayFiltros ? (
              <EmptyState
                icon="🔍"
                title="Ningún ticket coincide con los filtros"
                description="Prueba con otros filtros o límpialos para ver todos."
                action={{ label: 'Limpiar filtros', onClick: limpiar }}
              />
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
        </div>

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