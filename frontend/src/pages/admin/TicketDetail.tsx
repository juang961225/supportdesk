import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import Layout from '../../components/Layout'
import { useTituloPagina } from '../../hooks/useTituloPagina'
import { BotonVolver, TicketNoEncontrado } from '../../components/NavegacionTicket'
import { estaEnPausa } from '../../utils/ticketStatus'
import { PageSkeleton } from '../../components/Skeleton'
import CommentThread from '../../components/CommentThread'
import AttachmentList from '../../components/AttachmentList'
import ObserversPanel from '../../components/ObserversPanel'
import TicketTimeline from '../../components/TicketTimeline'
import TicketTramos from '../../components/TicketTramos'
import AssignTicketModal from '../../components/AssignTicketModal'
import MoveAreaModal from '../../components/MoveAreaModal'
import CategoriaTicketModal from '../../components/CategoriaTicketModal'
import SubmarcasTicketModal from '../../components/SubmarcasTicketModal'
import TicketSubmarcas from '../../components/TicketSubmarcas'
import PrioridadTicketModal from '../../components/PrioridadTicketModal'
import FechaLimiteModal from '../../components/FechaLimiteModal'
import { getTicketById } from '../../services/ticketService'
import { useToast } from '../../hooks/useToast'
import { useAuth } from '../../hooks/useAuth'
import type { Ticket } from '../../types'
import { TicketTimeBadge } from '../../components/TicketTimeBadge'
import { prioridadColor, estadoColor } from '../../utils/ticketColors'
import { estadoLabel, prioridadLabel } from '../../utils/ticketLabels'
import { formatFechaLimite } from '../../utils/fechas'
import { useTicketEnVivo } from '../../hooks/useTiempoReal'
import SlaBarra from '../../components/SlaBarra'
import TicketContexto from '../../components/TicketContexto'

function AdminTicketDetail() {
  const { id } = useParams<{ id: string }>()
  // Tiempo real: sube cuando otra persona cambia este ticket
  const { versionTicket } = useTicketEnVivo(id)
  const { toast } = useToast()
  const { user } = useAuth()
  // Superadmin es solo lectura en tickets
  const canAssign = user?.rol === 'admin'

  const [ticket, setTicket] = useState<Ticket | null>(null)
  useTituloPagina(ticket?.titulo)
  const [isLoading, setIsLoading] = useState(true)

  // 🔵 ADMIN: modales de asignar, mover de área y editar fecha límite
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [isMoveOpen, setIsMoveOpen] = useState(false)
  const [isCategoriaOpen, setIsCategoriaOpen] = useState(false)
  const [isSubmarcasOpen, setIsSubmarcasOpen] = useState(false)
  const [isPrioridadOpen, setIsPrioridadOpen] = useState(false)
  const [isFechaOpen, setIsFechaOpen] = useState(false)

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

  const handleUpdated = (updated: Ticket) => {
    setTicket(updated)
    setIsAssignOpen(false)
    setIsMoveOpen(false)
    setIsCategoriaOpen(false)
    setIsSubmarcasOpen(false)
    setIsPrioridadOpen(false)
    setIsFechaOpen(false)
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
        <TicketNoEncontrado destino="/admin/tickets" />
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl">
        {/* Botón volver */}
        <BotonVolver destino="/admin/tickets" />

        {/* En pantallas grandes: el ticket y su hilo a la izquierda; lo que solo ve el equipo, al lado */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-x-4 items-start">
          <div className="min-w-0">
            {/* Header del ticket */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                  {ticket.titulo}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <TicketTimeBadge fechaLimite={ticket.fechaLimite} estado={ticket.estado} sla={ticket.sla} />
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${prioridadColor[ticket.prioridad]}`}
                  >
                    {prioridadLabel[ticket.prioridad]}
                  </span>
                  {canAssign && ticket.estado !== 'cerrado' && (
                    <button
                      onClick={() => setIsPrioridadOpen(true)}
                      className="text-xs font-normal text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <Pencil className="inline w-3 h-3 mr-1" aria-hidden="true" />Prioridad
                    </button>
                  )}
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${estadoColor[ticket.estado]}`}
                  >
                    {estadoLabel[ticket.estado]}
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
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Creado por</p>
                  <p className="text-gray-800 dark:text-white font-medium">
                    {ticket.creadoPor.nombre}
                  </p>
                </div>
                <TicketSubmarcas ticket={ticket} onCorregir={canAssign ? () => setIsSubmarcasOpen(true) : undefined} />
                <TicketContexto contexto={ticket.contexto} />
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Categoría</p>
                  <p className="text-gray-800 dark:text-white font-medium">
                    {ticket.categoria.nombre}
                    {canAssign && (
                      <button
                        onClick={() => setIsCategoriaOpen(true)}
                        className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <Pencil className="inline w-3 h-3 mr-1" aria-hidden="true" />Corregir
                      </button>
                    )}
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
                    <p className="text-gray-500 dark:text-gray-400">Fecha límite del ticket</p>
                    <p className="text-gray-800 dark:text-white font-medium">
                      {formatFechaLimite(ticket.fechaLimite)}
                      {canAssign && ticket.estado !== 'cerrado' && (
                        <button
                          onClick={() => setIsFechaOpen(true)}
                          className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <Pencil className="inline w-3 h-3 mr-1" aria-hidden="true" />Editar
                        </button>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Hora Colombia</p>
                    {estaEnPausa(ticket.estado) && <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Plazo detenido</p>}
                    <SlaBarra sla={ticket.sla} />
                  </div>
                )}
                {(ticket.fechaLimiteArea ?? ticket.fechaLimite) && (
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Plazo del área</p>
                    <p className="text-gray-800 dark:text-white font-medium">
                      {formatFechaLimite((ticket.fechaLimiteArea ?? ticket.fechaLimite) as string)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Interno: mide este paso por {ticket.area?.nombre ?? 'el área'}</p>
                    <SlaBarra sla={ticket.slaArea} />
                  </div>
                )}
              </div>

              {/* 🔵 ADMIN: asignar y mover de área (no en cerrados; superadmin solo lectura) */}
              {canAssign && ticket.estado !== 'cerrado' && ticket.estado !== 'resuelto' && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                  <button
                    onClick={() => setIsAssignOpen(true)}
                    className="text-sm px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    {ticket.asignadoA ? 'Reasignar' : 'Asignar'}
                  </button>
                  <button
                    onClick={() => setIsMoveOpen(true)}
                    className="text-sm px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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

            {/* El admin puede comentar siempre (administrativo) — decisión de producto */}
            <CommentThread
              ticketId={ticket._id}
              canComment
              permiteNotaInterna
              creadorId={ticket.creadoPor._id}
              observadorIds={ticket.observadores?.map((o) => o._id)}
            />
          </div>

          <div className="min-w-0">
            <TicketTramos ticketId={ticket._id} refreshKey={`${ticket.estado}-${ticket.area?._id ?? ''}-${ticket.fechaLimite ?? ''}`} />

            <TicketTimeline ticketId={ticket._id} refreshKey={`${ticket.estado}-${ticket.asignadoA?._id ?? ''}-${ticket.area?._id ?? ''}-${ticket.observadores?.length ?? 0}-${ticket.fechaLimite ?? ''}-${ticket.updatedAt ?? ''}`} />
          </div>
        </div>
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

      <PrioridadTicketModal
        ticket={isPrioridadOpen ? ticket : null}
        onClose={() => setIsPrioridadOpen(false)}
        onUpdated={handleUpdated}
      />

      <CategoriaTicketModal
        ticket={isCategoriaOpen ? ticket : null}
        onClose={() => setIsCategoriaOpen(false)}
        onUpdated={handleUpdated}
      />

      <SubmarcasTicketModal
        ticket={isSubmarcasOpen ? ticket : null}
        onClose={() => setIsSubmarcasOpen(false)}
        onUpdated={handleUpdated}
      />

      <FechaLimiteModal
        ticket={isFechaOpen ? ticket : null}
        onClose={() => setIsFechaOpen(false)}
        onUpdated={handleUpdated}
      />
    </Layout>
  )
}

export default AdminTicketDetail