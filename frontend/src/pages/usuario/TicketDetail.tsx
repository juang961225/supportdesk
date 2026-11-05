import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { BotonVolver, TicketNoEncontrado } from '../../components/NavegacionTicket'
import Layout from '../../components/Layout'
import { useTituloPagina } from '../../hooks/useTituloPagina'
import { estaEnPausa } from '../../utils/ticketStatus'
import { PageSkeleton } from '../../components/Skeleton'
import CommentThread from '../../components/CommentThread'
import AttachmentList from '../../components/AttachmentList'
import ObserversPanel from '../../components/ObserversPanel'
import AreaRecorrido from '../../components/AreaRecorrido'
import EditTicketModal from '../../components/EditTicketModal'
import { getTicketById, updateTicketStatus } from '../../services/ticketService'
import { useToast } from '../../hooks/useToast'
import { useAuth } from '../../hooks/useAuth'
import { estadoColor } from '../../utils/ticketColors'
import { estadoLabelUsuario, prioridadLabel } from '../../utils/ticketLabels'
import { formatFechaCorta } from '../../utils/fechas'
import type { Ticket } from '../../types'
import { TicketTimeBadge } from '../../components/TicketTimeBadge'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useTicketEnVivo } from '../../hooks/useTiempoReal'
import SlaBarra from '../../components/SlaBarra'
import TicketContexto from '../../components/TicketContexto'
import TicketSubmarcas from '../../components/TicketSubmarcas'

function UsuarioTicketDetail() {
  const { id } = useParams<{ id: string }>()
  // Tiempo real: sube cuando otra persona cambia este ticket
  const { versionTicket } = useTicketEnVivo(id)
  const navigate = useNavigate()
  const { toast } = useToast()

  const { user } = useAuth()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  useTituloPagina(ticket?.titulo)
  const [isLoading, setIsLoading] = useState(true)
  const [isReopening, setIsReopening] = useState(false)
  const [isConfirmingReopen, setIsConfirmingReopen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelado = false // si cambia el ticket, la respuesta anterior ya no aplica
    const fetchData = async () => {
      try {
        const data = await getTicketById(id)
        if (!cancelado) setTicket(data)
      } catch {
        if (!cancelado) toast.error('No se pudo cargar el ticket')
      } finally {
        if (!cancelado) setIsLoading(false)
      }
    }
    fetchData()
    return () => {
      cancelado = true
    }
  }, [id, versionTicket, toast])

  const handleConfirm = async () => {
    if (!id) return
    setIsReopening(true)
    try {
      setTicket(await updateTicketStatus(id, 'cerrado'))
      toast.success('Gracias por confirmar. Ticket cerrado')
    } catch {
      toast.error('No se pudo confirmar el ticket')
    } finally {
      setIsReopening(false)
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
        <TicketNoEncontrado destino="/usuario/dashboard" />
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
        <BotonVolver destino="/usuario/dashboard" />

        {/* El soporte espera una respuesta: al comentar, el ticket vuelve a atención */}
        {ticket.estado === 'esperando_usuario' && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 mb-4">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Soporte necesita tu respuesta para continuar. Escríbela en la conversación y el ticket seguirá su atención. Si no respondes en 5 días laborales, se cerrará automáticamente.
            </p>
            <a href="#responder" className="inline-block mt-3 px-4 py-2 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors">
              Responder
            </a>
          </div>
        )}

        {/* Resuelto: solo el creador confirma o reabre */}
        {ticket.estado === 'resuelto' && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-4">
            <p className="text-gray-700 dark:text-gray-200 text-sm mb-4">
              {esCreador ? 'Soporte marcó este ticket como resuelto. ¿Se solucionó tu problema? Si no respondes en 3 días laborales, se cerrará automáticamente.' : 'Soporte marcó este ticket como resuelto. Quien lo creó puede confirmarlo.'}
            </p>
            {esCreador && (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleConfirm}
                  disabled={isReopening}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Sí, se solucionó
                </button>
                <button
                  onClick={() => setIsConfirmingReopen(true)}
                  disabled={isReopening}
                  className="px-4 py-2 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  No, sigue el problema
                </button>
              </div>
            )}
          </div>
        )}

        {/* Header del ticket */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              {ticket.titulo}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {esCreador && ticket.sinAtender && (
                <button
                  onClick={() => setIsEditOpen(true)}
                  className="text-sm px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Pencil className="inline w-3 h-3 mr-1" aria-hidden="true" />Editar
                </button>
              )}
              <span className={`text-xs px-2 py-1 rounded-full ${estadoColor[ticket.estado]}`}>
                {estadoLabelUsuario[ticket.estado]}
              </span>
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-300 mb-4 whitespace-pre-line break-words">
            {ticket.descripcion}
          </p>
          {ticket.archivos.length > 0 && (
            <div className="mb-4">
              <AttachmentList archivos={ticket.archivos} />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <TicketSubmarcas ticket={ticket} />
            <TicketContexto contexto={ticket.contexto} />
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
              <p className="text-gray-500 dark:text-gray-400">Área</p>
              <p className="text-gray-800 dark:text-white font-medium">
                {ticket.area?.nombre ?? 'Sin área'}
              </p>
            </div>
            {ticket.fechaLimite && (
              <div>
                <p className="text-gray-500 dark:text-gray-400">Fecha límite</p>
                <p className="text-gray-800 dark:text-white font-medium">
                  {formatFechaCorta(ticket.fechaLimite)}
                </p>
                {estaEnPausa(ticket.estado) && <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Plazo detenido</p>}
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

        {/* Un ticket cerrado no se reabre: si el problema vuelve, se crea uno nuevo */}
        {ticket.estado === 'cerrado' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-4">
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
              Este ticket está cerrado. Si el problema volvió, crea un ticket nuevo.
            </p>
            <button
              onClick={() => navigate('/usuario/tickets/new')}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Crear ticket nuevo
            </button>
          </div>
        )}
      </div>

      <EditTicketModal
        ticket={isEditOpen ? ticket : null}
        onClose={() => setIsEditOpen(false)}
        onSaved={(updated) => {
          setTicket(updated)
          setIsEditOpen(false)
        }}
      />

      <ConfirmDialog
        isOpen={isConfirmingReopen}
        title="Reabrir ticket"
        message="El ticket volverá al equipo que lo atendió para que lo revise de nuevo."
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