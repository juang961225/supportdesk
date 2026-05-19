import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Layout from '../../components/Layout'
import Modal from '../../components/Modal'
import { getTicketById, assignTicket } from '../../services/ticketService'
import { getUsers } from '../../services/userService'
import { getComments, createComment } from '../../services/commentService'
import type { Comment } from '../../services/commentService'
import { useToast } from '../../hooks/useToast'
import type { Ticket, User } from '../../types'

const prioridadColor: Record<string, string> = {
  critica: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  alta: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  media: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  baja: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
}

const estadoColor: Record<string, string> = {
  abierto: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  en_progreso: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  en_revision: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  cerrado: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  reabierto: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
}

function AdminTicketDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [soporters, setSoporters] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [contenido, setContenido] = useState('')
  const [isSending, setIsSending] = useState(false)

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
      const [ticketData, commentsData, usersData] = await Promise.all([
        getTicketById(ticketId),
        getComments(ticketId),
        getUsers(),
      ])
      setTicket(ticketData)
      setComments(commentsData)
      setSoporters(usersData.filter((u) => u.rol === 'soporte'))
    } catch {
      toast.error('No se pudo cargar el ticket')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contenido.trim() || !id) return

    setIsSending(true)
    try {
      const newComment = await createComment(id, contenido)
      setComments([...comments, newComment])
      setContenido('')
      toast.success('Comentario enviado')
    } catch {
      toast.error('No se pudo enviar el comentario')
    } finally {
      setIsSending(false)
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

          {/* 🔵 ADMIN: única acción de escritura sobre el ticket */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleOpenAssign}
              className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              {ticket.asignadoA ? 'Reasignar' : 'Asignar'}
            </button>
          </div>
        </div>

        {/* Historial de comentarios */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Historial ({comments.length})
          </h3>

          {comments.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No hay comentarios todavía
            </p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment._id} className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      {comment.autor.nombre.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-white">
                        {comment.autor.nombre}
                      </p>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(comment.createdAt).toLocaleString('es-CO', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {comment.contenido}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agregar comentario */}
        {/* 🔵 ADMIN: aquí NO chequeamos ticket.estado !== 'cerrado' */}
        {/* Razón: el admin puede comentar siempre (administrativo) — decisión de producto */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Agregar comentario
          </h3>
          <form onSubmit={handleSendComment}>
            <textarea
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="Escribe tu comentario..."
            />
            <div className="flex justify-end mt-3">
              <button
                type="submit"
                disabled={isSending || !contenido.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSending ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </form>
        </div>
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