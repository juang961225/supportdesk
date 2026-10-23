import { useState, useEffect } from 'react'
import axios from 'axios'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { PageSkeleton } from '../../components/Skeleton'
import CommentThread from '../../components/CommentThread'
import AttachmentList from '../../components/AttachmentList'
import ObserversPanel from '../../components/ObserversPanel'
import TicketTimeline from '../../components/TicketTimeline'
import AssignTicketModal from '../../components/AssignTicketModal'
import MoveAreaModal from '../../components/MoveAreaModal'
import { getTicketById, updateTicketStatus, takeTicket, releaseTicket } from '../../services/ticketService'
import { useToast } from '../../hooks/useToast'
import { useAuth } from '../../hooks/useAuth'
import { estadoColor } from '../../utils/ticketColors'
import type { Ticket } from '../../types'
import { TicketTimeBadge } from '../../components/TicketTimeBadge'
import ConfirmDialog from '../../components/ConfirmDialog'
import { transicionesSoporte } from '../../utils/ticketStatus'
import type { EstadoTicket } from '../../utils/ticketStatus'

// Texto y color del botón según el estado destino
const accionEstado: Record<EstadoTicket, { label: string; className: string }> = {
  en_progreso: { label: 'En progreso', className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  en_revision: { label: 'En revisión', className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
  cerrado: { label: 'Cerrar ticket', className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  abierto: { label: 'Abierto', className: '' },
  reabierto: { label: 'Reabrir', className: '' },
}

function SoporteTicketDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isConfirmingClose, setIsConfirmingClose] = useState(false)

  // Acciones de la cola: tomar, soltar, pasar y mover
  const [isActing, setIsActing] = useState(false)
  const [isConfirmingRelease, setIsConfirmingRelease] = useState(false)
  const [isPassOpen, setIsPassOpen] = useState(false)
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

  const handleUpdateStatus = async (estado: EstadoTicket) => {
    if (!id) return
    setIsUpdatingStatus(true)
    try {
      const updated = await updateTicketStatus(id, estado)
      setTicket(updated)
      toast.success(`Ticket marcado como ${accionEstado[estado].label.toLowerCase()}`)
    } catch (err) {
      const apiMsg = axios.isAxiosError(err) ? err.response?.data?.message : undefined
      toast.error(apiMsg || 'No se pudo actualizar el estado del ticket')
    } finally {
      setIsUpdatingStatus(false)
      setIsConfirmingClose(false)
    }
  }

  // Cerrar pide confirmación; el resto de transiciones es directo
  const handleClickEstado = (estado: EstadoTicket) => {
    if (estado === 'cerrado') {
      setIsConfirmingClose(true)
    } else {
      handleUpdateStatus(estado)
    }
  }

  const apiError = (err: unknown, fallback: string) =>
    (axios.isAxiosError(err) ? err.response?.data?.message : undefined) || fallback

  const handleTake = async () => {
    if (!id) return
    setIsActing(true)
    try {
      setTicket(await takeTicket(id))
      toast.success('Tomaste el ticket')
    } catch (err) {
      toast.error(apiError(err, 'No se pudo tomar el ticket'))
    } finally {
      setIsActing(false)
    }
  }

  const handleRelease = async () => {
    if (!id) return
    setIsActing(true)
    try {
      setTicket(await releaseTicket(id))
      toast.success('El ticket volvió a la cola')
    } catch (err) {
      toast.error(apiError(err, 'No se pudo soltar el ticket'))
    } finally {
      setIsActing(false)
      setIsConfirmingRelease(false)
    }
  }

  const handleUpdated = (updated: Ticket) => {
    setTicket(updated)
    setIsPassOpen(false)
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

  const enCola = !ticket.asignadoA
  const esMio = ticket.asignadoA?._id === user?._id

  return (
    <Layout>
      <div className="max-w-3xl">
        {/* Botón volver */}
        <button
          onClick={() => navigate('/soporte/dashboard')}
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
                {ticket.asignadoA?.nombre ?? 'En cola (sin asignar)'}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Prioridad</p>
              <p className="text-gray-800 dark:text-white font-medium capitalize">
                {ticket.prioridad}&nbsp;&nbsp;&nbsp;
                <TicketTimeBadge fechaLimite={ticket.fechaLimite} estado={ticket.estado} />
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

          {/* Acciones según la relación del soporte con el ticket */}
          {ticket.estado !== 'cerrado' && enCola && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Este ticket está en la cola de {ticket.area?.nombre ?? 'tu área'}.
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleTake}
                  disabled={isActing}
                  className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isActing ? 'Tomando...' : 'Tomar ticket'}
                </button>
                <button
                  onClick={() => setIsMoveOpen(true)}
                  className="text-xs px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Mover de área
                </button>
              </div>
            </div>
          )}

          {ticket.estado !== 'cerrado' && esMio && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Cambiar estado:</p>
                <div className="flex gap-2 flex-wrap">
                  {transicionesSoporte(ticket.estado).map((estado) => (
                    <button
                      key={estado}
                      onClick={() => handleClickEstado(estado)}
                      disabled={isUpdatingStatus}
                      className={`text-xs px-3 py-1 rounded hover:opacity-80 transition-opacity disabled:opacity-50 ${accionEstado[estado].className}`}
                    >
                      {accionEstado[estado].label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setIsPassOpen(true)}
                  className="text-xs px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Pasar a compañero
                </button>
                <button
                  onClick={() => setIsMoveOpen(true)}
                  className="text-xs px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Mover de área
                </button>
                <button
                  onClick={() => setIsConfirmingRelease(true)}
                  className="text-xs px-3 py-1 border border-red-300 text-red-600 dark:border-red-700 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Soltar
                </button>
              </div>
            </div>
          )}

          {ticket.estado !== 'cerrado' && !enCola && !esMio && (
            <p className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
              Lo atiende {ticket.asignadoA?.nombre}. Puedes ver y comentar; las acciones son de quien lo atiende.
            </p>
          )}

          <ObserversPanel
            ticket={ticket}
            currentUserId={user?._id}
            canManage={false}
            onUpdated={(updated) => updated && setTicket(updated)}
          />
        </div>

        <TicketTimeline ticketId={ticket._id} refreshKey={`${ticket.estado}-${ticket.asignadoA?._id ?? ''}-${ticket.area?._id ?? ''}-${ticket.observadores?.length ?? 0}`} />

        <CommentThread
          ticketId={ticket._id}
          canComment={ticket.estado !== 'cerrado'}
          creadorId={ticket.creadoPor._id}
          observadorIds={ticket.observadores?.map((o) => o._id)}
        />
      </div>

      <ConfirmDialog
        isOpen={isConfirmingClose}
        title="Cerrar ticket"
        message="El ticket quedará cerrado. Solo el usuario que lo creó podrá reabrirlo."
        confirmLabel="Cerrar ticket"
        isLoading={isUpdatingStatus}
        onConfirm={() => handleUpdateStatus('cerrado')}
        onCancel={() => setIsConfirmingClose(false)}
      />

      <ConfirmDialog
        isOpen={isConfirmingRelease}
        title="Soltar ticket"
        message="El ticket vuelve a la cola de su área, sin asignar y en estado Abierto."
        confirmLabel="Soltar"
        isLoading={isActing}
        onConfirm={handleRelease}
        onCancel={() => setIsConfirmingRelease(false)}
      />

      <AssignTicketModal
        ticket={isPassOpen ? ticket : null}
        title="Pasar a un compañero"
        excludeUserId={user?._id}
        onClose={() => setIsPassOpen(false)}
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

export default SoporteTicketDetail