import { useState, useEffect } from 'react'
import { getComments, createComment } from '../services/commentService'
import type { Comment } from '../services/commentService'
import { useToast } from '../hooks/useToast'

interface CommentThreadProps {
  ticketId: string
  canComment: boolean
  placeholder?: string
  creadorId?: string       // para marcar al creador del ticket
  observadorIds?: string[] // para marcar a los observadores
}

const formatFecha = (fecha: string) =>
  new Date(fecha).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const badgeClass: Record<string, string> = {
  Creador: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  Observador: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  Soporte: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  Admin: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  Superadmin: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
}

// Hilo de comentarios del ticket: carga, lista y envía por sí mismo
function CommentThread({
  ticketId,
  canComment,
  placeholder = 'Escribe tu comentario...',
  creadorId,
  observadorIds = [],
}: CommentThreadProps) {
  const { toast } = useToast()
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [contenido, setContenido] = useState('')
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setComments(await getComments(ticketId))
      } catch {
        toast.error('No se pudieron cargar los comentarios')
      } finally {
        setIsLoading(false)
      }
    }
    fetchComments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId])

  // Papel de quien comenta dentro del ticket
  const papelDe = (autor: Comment['autor']): string | null => {
    if (autor._id === creadorId) return 'Creador'
    if (observadorIds.includes(autor._id)) return 'Observador'
    if (autor.rol === 'soporte') return 'Soporte'
    if (autor.rol === 'admin') return 'Admin'
    if (autor.rol === 'superadmin') return 'Superadmin'
    return null
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contenido.trim()) return

    setIsSending(true)
    try {
      const newComment = await createComment(ticketId, contenido)
      setComments([...comments, newComment])
      setContenido('')
      toast.success('Comentario enviado')
    } catch {
      toast.error('No se pudo enviar el comentario')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <>
      {/* Historial de comentarios */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Historial ({comments.length})
        </h3>

        {isLoading ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">Cargando comentarios...</p>
        ) : comments.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No hay comentarios todavía</p>
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
                    {papelDe(comment.autor) && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${badgeClass[papelDe(comment.autor) ?? '']}`}>
                        {papelDe(comment.autor)}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {formatFecha(comment.createdAt)}
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
      {canComment && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Agregar comentario
          </h3>
          <form onSubmit={handleSend}>
            <textarea
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder={placeholder}
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
    </>
  )
}

export default CommentThread
