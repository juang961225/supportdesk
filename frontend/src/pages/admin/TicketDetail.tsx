import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Layout from '../../components/Layout'
import CommentThread from '../../components/CommentThread'
import TicketTimeline from '../../components/TicketTimeline'
import Modal from '../../components/Modal'
import { getTicketById, assignTicket } from '../../services/ticketService'
import { getUsers } from '../../services/userService'
import { useToast } from '../../hooks/useToast'
import { useAuth } from '../../hooks/useAuth'
import type { Ticket, User } from '../../types'
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
  const [soporters, setSoporters] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 🔵 ADMIN: estado del modal de asignación (igual que TicketsPage)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedSoporter, setSelectedSoporter] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (id) fetchData(id)
  }, [id])

  const fetchData = async (ticketId: string) => {
    try {
      // 🔵 ADMIN: además del ticket y comentarios, también cargamos soporters para el modal
      const [ticketData, usersData] = await Promise.all([
        getTicketById(ticketId),
        getUsers(),
      ])
      setTicket(ticketData)
      setSoporters(usersData.filter((u) => u.rol === 'soporte' && u.estado === 'activo'))
    } catch {
      toast.error('No se pudo cargar el ticket')
    } finally {
      setIsLoading(false)
    }
  }

  // 🔵 ADMIN: abrir modal de asignación (igual que en TicketsPage)
  const handleOpenAssign = () => {
    if (!ticket) return
    setSelectedSoporter(ticket.asignadoA?._id || '')
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedSoporter('')
    setFormError('')
  }

  // 🔵 ADMIN: asignar/reasignar (lógica adaptada de TicketsPage)
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedSoporter) {
      setFormError('Debes seleccionar un soporter')
      toast.warning('Debes seleccionar un soporter')
      return
    }

    if (!ticket) return

    setIsSubmitting(true)
    setFormError('')

    try {
      const updatedTicket = await assignTicket(ticket._id, selectedSoporter)
      setTicket(updatedTicket)
      toast.success(
        `Ticket asignado a ${updatedTicket.asignadoA?.nombre ?? 'soporter'}`
      )
      handleCloseModal()
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message || 'Error al asignar el ticket'
        setFormError(msg)
        toast.error(msg)
      } else {
        setFormError('Error al asignar el ticket')
        toast.error('Error al asignar el ticket')
      }
    } finally {
      setIsSubmitting(false)
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

          {/* 🔵 ADMIN: única acción de escritura sobre el ticket (no en cerrados) */}
          {canAssign && ticket.estado !== 'cerrado' && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleOpenAssign}
                className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                {ticket.asignadoA ? 'Reasignar' : 'Asignar'}
              </button>
            </div>
          )}
        </div>

        <TicketTimeline ticketId={ticket._id} refreshKey={`${ticket.estado}-${ticket.asignadoA?._id ?? ''}`} />

        {/* El admin puede comentar siempre (administrativo) — decisión de producto */}
        <CommentThread ticketId={ticket._id} canComment />
      </div>

      {/* Modal de asignación */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={`${ticket.asignadoA ? 'Reasignar' : 'Asignar'} ticket`}
      >
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-medium">Ticket:</span> {ticket.titulo}
          </p>
        </div>

        <form onSubmit={handleAssign}>
          {formError && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded mb-4 text-sm">
              {formError}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Soporter
            </label>
            <select
              value={selectedSoporter}
              onChange={(e) => setSelectedSoporter(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecciona un soporter</option>
              {soporters.map((soporter) => (
                <option key={soporter._id} value={soporter._id}>
                  {soporter.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Asignando...' : 'Asignar'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}

export default AdminTicketDetail