import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { PageSkeleton } from '../../components/Skeleton'
import CommentThread from '../../components/CommentThread'
import AttachmentList from '../../components/AttachmentList'
import ObserversPanel from '../../components/ObserversPanel'
import AreaRecorrido from '../../components/AreaRecorrido'
import { getTicketById, updateTicketStatus } from '../../services/ticketService'
import { useToast } from '../../hooks/useToast'
import { useAuth } from '../../hooks/useAuth'
import { estadoColor } from '../../utils/ticketColors'
import { estadoLabel, prioridadLabel } from '../../utils/ticketLabels'
import { formatFechaLimite } from '../../utils/fechas'
import type { Ticket } from '../../types'
import { TicketTimeBadge } from '../../components/TicketTimeBadge'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useTicketEnVivo } from '../../hooks/useTiempoReal'
import SlaBarra from '../../components/SlaBarra'

function UsuarioTicketDetail() {
  const { id } = useParams<{ id: string }>()
  // Tiempo real: sube cuando otra persona cambia este ticket
  const { versionTicket } = useTicketEnVivo(id)
  const navigate = useNavigate()
  const { toast } = useToast()

  const { user } = useAuth()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isReopening, setIsReopening] = useState(false)
  const [isConfirmingReopen, setIsConfirmingReopen] = useState(false)

  useEffect(() => {
    if (id) fetchData(id)
  }, [id, versionTicket])

  const fetchData = async (ticketId: string) => {
    try {
      setTicket(await getTicketById(ticketId))
    } catch {
      toast.error('No se pudo cargar el ticket')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReopen = async () => {
    if (!id) return
    setIsReopening(true)
    try {
      const updated = await updateTicketStatus(id, 'reabierto')
      setTicket(updated)
      toast.success('Ticket reabierto')
    } catch {
      toast.error('No se pudo reabrir el ticket')
    } finally {
      setIsReopening(false)
      setIsConfirmingReopen(false)
    }
  }

  if (isLoading) {
    return (
      <Layout>
        <PageSkeleton variant="detalle" />
      </Layout>
    )
  }

  if (!ticket) {
    return (
      <Layout>
        <p className="text-gray-500 dark:text-gray-400">Ticket no encontrado</p>
      </Layout>
    )
  }

  const esCreador = ticket.creadoPor._id === user?._id

  // Si el usuario deja de seguir el ticket ya no puede verlo: vuelve a su dashboard
  const handleObserversUpdated = (updated: Ticket | null) => {
    if (updated) {
      setTicket(updated)
    } else {
      navigate('/usuario/dashboard')
    }
  }

  return (
    <Layout>
      <div className="max-w-3xl">
        <button
          onClick={() => navigate('/usuario/dashboard')}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-6 flex items-center gap-1"
        >
          ← Volver
        </button>

        {/* Header del ticket */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              {ticket.titulo}
            </h2>
            <span className={`text-xs px-2 py-1 rounded-full ${estadoColor[ticket.estado]}`}>
              {estadoLabel[ticket.estado]}
            </span>
          </div>

          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {ticket.descripcion}
          </p>
          {ticket.archivos.length > 0 && (
            <div className="mb-4">
              <AttachmentList archivos={ticket.archivos} />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Categoría</p>
              <p className="text-gray-800 dark:text-white font-medium">
                {ticket.categoria.nombre}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Prioridad</p>
              <p className="text-gray-800 dark:text-white font-medium flex flex-wrap items-center gap-2">
                {prioridadLabel[ticket.prioridad]}
                <TicketTimeBadge fechaLimite={ticket.fechaLimite} estado={ticket.estado} sla={ticket.sla} />
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Está en</p>
              <p className="text-gray-800 dark:text-white font-medium">
                {ticket.area?.nombre ?? 'Sin área'}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Atendido por</p>
              <p className="text-gray-800 dark:text-white font-medium">
                {ticket.asignadoA ? ticket.asignadoA.nombre : 'Pendiente de asignación'}
              </p>
            </div>
            {ticket.fechaLimite && (
              <div>
                <p className="text-gray-500 dark:text-gray-400">Fecha límite</p>
                <p className="text-gray-800 dark:text-white font-medium">
                  {formatFechaLimite(ticket.fechaLimite)}
                </p>
                <SlaBarra sla={ticket.sla} />
              </div>
            )}
          </div>

          <AreaRecorrido ticketId={ticket._id} refreshKey={ticket.area?._id} />

          <ObserversPanel
            ticket={ticket}
            currentUserId={user?._id}
            canManage={esCreador}
            onUpdated={handleObserversUpdated}
          />
        </div>

        <CommentThread
          ticketId={ticket._id}
          canComment={ticket.estado !== 'cerrado'}
          placeholder="Escribe tu comentario o agrega más información..."
          creadorId={ticket.creadoPor._id}
          observadorIds={ticket.observadores?.map((o) => o._id)}
        />

        {/* Ticket cerrado — opción de reabrir */}
        {/* Solo el creador puede reabrir */}
        {ticket.estado === 'cerrado' && esCreador && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
              Este ticket está cerrado. Si el problema no fue resuelto puedes reabrirlo.
            </p>
            <button
              onClick={() => setIsConfirmingReopen(true)}
              disabled={isReopening}
              className="px-4 py-2 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {isReopening ? 'Reabriendo...' : 'Reabrir ticket'}
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={isConfirmingReopen}
        title="Reabrir ticket"
        message="El ticket volverá al soporte que lo atendió para que lo revise de nuevo."
        confirmLabel="Reabrir"
        variant="default"
        isLoading={isReopening}
        onConfirm={handleReopen}
        onCancel={() => setIsConfirmingReopen(false)}
      />
    </Layout>
  )
}

export default UsuarioTicketDetail