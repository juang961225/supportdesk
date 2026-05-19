import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { getTicketById, updateTicketStatus } from '../../services/ticketService'
import { getComments, createComment } from '../../services/commentService'
import type { Comment } from '../../services/commentService'
import { useToast } from '../../hooks/useToast'
import { estadoColor } from '../../utils/ticketColors'
import type { Ticket } from '../../types'
import { TicketTimeBadge } from '../../components/TicketTimeBadge'

function SoporteTicketDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [contenido, setContenido] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  useEffect(() => {
    if (id) fetchData(id)
  }, [id])

  const fetchData = async (ticketId: string) => {
    try {
      const [ticketData, commentsData] = await Promise.all([
        getTicketById(ticketId),
        getComments(ticketId)
      ])
      setTicket(ticketData)
      setComments(commentsData)
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

  const handleUpdateStatus = async (estado: string) => {
    if (!id) return
    setIsUpdatingStatus(true)
    try {
      const updated = await updateTicketStatus(id, estado)
      setTicket(updated)
      toast.success(`Ticket marcado como ${estado.replace('_', ' ')}`)
    } catch {
      toast.error('No se pudo actualizar el estado del ticket')
    } finally {
      setIsUpdatingStatus(false)
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
                <TicketTimeBadge fechaLimite={ticket.fechaLimite} />
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
                {ticket.estado !== 'en_progreso' && (
                  <button
                    onClick={() => handleUpdateStatus('en_progreso')}
                    disabled={isUpdatingStatus}
                    className="text-xs px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded hover:opacity-80 transition-opacity disabled:opacity-50"
                  >
                    En progreso
                  </button>
                )}
                {ticket.estado !== 'en_revision' && (
                  <button
                    onClick={() => handleUpdateStatus('en_revision')}
                    disabled={isUpdatingStatus}
                    className="text-xs px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded hover:opacity-80 transition-opacity disabled:opacity-50"
                  >
                    En revisión
                  </button>
                )}
                <button
                  onClick={() => handleUpdateStatus('cerrado')}
                  disabled={isUpdatingStatus}
                  className="text-xs px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded hover:opacity-80 transition-opacity disabled:opacity-50"
                >
                  Cerrar ticket
                </button>
              </div>
            </div>
          )}
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
        {ticket.estado !== 'cerrado' && (
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
        )}
      </div>
    </Layout>
  )
}

export default SoporteTicketDetail