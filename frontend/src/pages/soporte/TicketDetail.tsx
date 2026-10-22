import { useState, useEffect } from 'react'
import axios from 'axios'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import CommentThread from '../../components/CommentThread'
import { getTicketById, updateTicketStatus } from '../../services/ticketService'
import { useToast } from '../../hooks/useToast'
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

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isConfirmingClose, setIsConfirmingClose] = useState(false)

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

          {/* Acciones de estado */}
          {ticket.estado !== 'cerrado' && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Cambiar estado:
              </p>
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
          )}
        </div>

        <CommentThread ticketId={ticket._id} canComment={ticket.estado !== 'cerrado'} />
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
    </Layout>
  )
}

export default SoporteTicketDetail