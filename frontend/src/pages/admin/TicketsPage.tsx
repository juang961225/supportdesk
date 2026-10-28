import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { PageSkeleton } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import TicketCard from '../../components/TicketCard'
import TicketList from '../../components/TicketList'
import AssignTicketModal from '../../components/AssignTicketModal'
import TicketFilters from '../../components/TicketFilters'
import { getTicketsPage, exportarTickets, mensajeDeErrorBlob } from '../../services/ticketService'
import type { FormatoExportacion } from '../../services/ticketService'
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
import { useRecargaEnVivo } from '../../hooks/useTiempoReal'

function TicketsPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  // Superadmin es solo lectura en tickets
  const canAssign = user?.rol === 'admin'
  const esSuperadmin = user?.rol === 'superadmin'
  const { filtros, setFiltro, limpiar, hayFiltros, clave } = useTicketFilters()
  const {
    items: tickets, setItems: setTickets, pagination, setPage, isLoading, isFetching, error, recargar
  } = usePaginatedList<Ticket>(
    (page) => getTicketsPage(page, filtros),
    () => toast.error('No se pudieron cargar los tickets'),
    clave
  )
  const navigate = useNavigate()

  // Tiempo real: recargar la página actual (mismos filtros) cuando cambia un ticket visible
  const enVivo = useRecargaEnVivo()
  useEffect(() => {
    if (enVivo > 0) recargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enVivo])

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

  // Exportación (Excel o PDF) de la lista filtrada, todas las páginas
  const [exportando, setExportando] = useState<FormatoExportacion | null>(null)

  const handleExportar = async (formato: FormatoExportacion) => {
    setExportando(formato)
    try {
      await exportarTickets(formato, filtros)
      toast.success(formato === 'xlsx' ? 'Excel descargado' : 'PDF descargado')
    } catch (err) {
      toast.error(await mensajeDeErrorBlob(err, 'No se pudo exportar la lista'))
    } finally {
      setExportando(null)
    }
  }

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
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {pagination?.total ?? tickets.length} {hayFiltros ? 'tickets encontrados' : 'tickets en total'}
            </p>
            {/* Exporta lo que se ve con los filtros actuales (todas las páginas) */}
            {(['xlsx', 'pdf'] as const).map((formato) => (
              <button
                key={formato}
                type="button"
                onClick={() => handleExportar(formato)}
                disabled={exportando !== null || (pagination?.total ?? 0) === 0}
                className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {exportando === formato ? 'Exportando…' : formato === 'xlsx' ? '⬇ Excel' : '⬇ PDF'}
              </button>
            ))}
          </div>
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