import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { PageSkeleton } from '../../components/Skeleton'
import CommentThread from '../../components/CommentThread'
import AttachmentList from '../../components/AttachmentList'
import ObserversPanel from '../../components/ObserversPanel'
import TicketTimeline from '../../components/TicketTimeline'
import AssignTicketModal from '../../components/AssignTicketModal'
import MoveAreaModal from '../../components/MoveAreaModal'
import { getTicketById } from '../../services/ticketService'
import { useToast } from '../../hooks/useToast'
import { useAuth } from '../../hooks/useAuth'
import type { Ticket } from '../../types'
import { TicketTimeBadge } from '../../components/TicketTimeBadge'
import { prioridadColor, estadoColor } from '../../utils/ticketColors'

function AdminTicketDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  // Superadmin es solo lectura en tickets
  const canAssign = user?.rol === 'admin'

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 🔵 ADMIN: modales de asignar y mover de área
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [isMoveOpen, setIsMoveOpen] = useState(false)

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

  const handleUpdated = (updated: Ticket) => {
    setTicket(updated)
    setIsAssignOpen(false)
    setIsMoveOpen(false)
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

  return (
    <Layout>
      <div className="max-w-3xl">
        {/* Botón volver */}
        <button
          onClick={() => navigate('/admin/tickets')}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-6 flex items-center gap-1"
        >
          ← Volver a tickets
        </button>

        {/* Header del ticket */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-4">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              {ticket.titulo}
            </h2>
            <div className="flex items-center gap-2">
              <TicketTimeBadge fechaLimite={ticket.fechaLimite} estado={ticket.estado} />
              <span
                className={`text-xs px-2 py-1 rounded-full ${prioridadColor[ticket.prioridad]}`}
              >
                {ticket.prioridad}
              </span>
              <span
                className={`text-xs px-2 py-1 rounded-full ${estadoColor[ticket.estado]}`}
              >
                {ticket.estado}
              </span>
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {ticket.descripcion}
          </p>
          {ticket.archivos.length > 0 && (
            <div className="mb-4">
              <AttachmentList archivos={ticket.archivos} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Creado por</p>
              <p className="text-gray-800 dark:text-white font-medium">
                {ticket.creadoPor.nombre}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Categoría</p>
              <p className="text-gray-800 dark:text-white font-medium">
                {ticket.categoria.nombre}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Área</p>
              <p className="text-gray-800 dark:text-white font-medium">
                {ticket.area?.nombre ?? 'Sin área'}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Asignado a</p>
              <p className="text-gray-800 dark:text-white font-medium">
                {ticket.asignadoA?.nombre || 'Sin asignar'}
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

          {/* 🔵 ADMIN: asignar y mover de área (no en cerrados; superadmin solo lectura) */}
          {canAssign && ticket.estado !== 'cerrado' && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <button
                onClick={() => setIsAssignOpen(true)}
                className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                {ticket.asignadoA ? 'Reasignar' : 'Asignar'}
              </button>
              <button
                onClick={() => setIsMoveOpen(true)}
                className="text-xs px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Mover de área
              </button>
            </div>
          )}

          <ObserversPanel
            ticket={ticket}
            currentUserId={user?._id}
            canManage={canAssign}
            onUpdated={(updated) => updated && setTicket(updated)}
          />
        </div>

        <TicketTimeline ticketId={ticket._id} refreshKey={`${ticket.estado}-${ticket.asignadoA?._id ?? ''}-${ticket.area?._id ?? ''}-${ticket.observadores?.length ?? 0}`} />

        {/* El admin puede comentar siempre (administrativo) — decisión de producto */}
        <CommentThread
          ticketId={ticket._id}
          canComment
          creadorId={ticket.creadoPor._id}
          observadorIds={ticket.observadores?.map((o) => o._id)}
        />
      </div>

      <AssignTicketModal
        ticket={isAssignOpen ? ticket : null}
        title={`${ticket.asignadoA ? 'Reasignar' : 'Asignar'} ticket`}
        onClose={() => setIsAssignOpen(false)}
        onAssigned={handleUpdated}
      />

      <MoveAreaModal
        ticket={isMoveOpen ? ticket : null}
        onClose={() => setIsMoveOpen(false)}
        onMoved={handleUpdated}
      />
    </Layout>
  )
}

export default AdminTicketDetail