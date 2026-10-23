import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import CommentThread from '../../components/CommentThread'
import AreaRecorrido from '../../components/AreaRecorrido'
import { getTicketById, updateTicketStatus } from '../../services/ticketService'
import { useToast } from '../../hooks/useToast'
import { estadoColor } from '../../utils/ticketColors'
import type { Ticket } from '../../types'
import { TicketTimeBadge } from '../../components/TicketTimeBadge'
import ConfirmDialog from '../../components/ConfirmDialog'

function UsuarioTicketDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isReopening, setIsReopening] = useState(false)
  const [isConfirmingReopen, setIsConfirmingReopen] = useState(false)

  useEffect(() => {
    if (id) fetchData(id)
  }, [id])

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
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500 dark:text-gray-400">Cargando...</p>
        </div>
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
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              {ticket.titulo}
            </h2>
            <span className={`text-xs px-2 py-1 rounded-full ${estadoColor[ticket.estado]}`}>
              {ticket.estado}
            </span>
          </div>

          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {ticket.descripcion}
          </p>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Categoría</p>
              <p className="text-gray-800 dark:text-white font-medium">
                {ticket.categoria.nombre}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Prioridad</p>
              <p className="text-gray-800 dark:text-white font-medium capitalize">
                {ticket.prioridad}&nbsp;&nbsp;&nbsp;
                <TicketTimeBadge fechaLimite={ticket.fechaLimite} estado={ticket.estado} />
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
                  {new Date(ticket.fechaLimite).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          <AreaRecorrido ticketId={ticket._id} refreshKey={ticket.area?._id} />
        </div>

        <CommentThread
          ticketId={ticket._id}
          canComment={ticket.estado !== 'cerrado'}
          placeholder="Escribe tu comentario o agrega más información..."
        />

        {/* Ticket cerrado — opción de reabrir */}
        {ticket.estado === 'cerrado' && (
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