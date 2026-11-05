import { useState, useEffect } from 'react'
import axios from 'axios'
import Modal from './Modal'
import { editTicket } from '../services/ticketService'
import { useToast } from '../hooks/useToast'
import type { Ticket } from '../types'

interface EditTicketModalProps {
  ticket: Ticket | null
  onClose: () => void
  onSaved: (ticket: Ticket) => void
}

const inputClass =
  'w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

// El creador corrige título y descripción mientras nadie atiende el ticket
function EditTicketModal({ ticket, onClose, onSaved }: EditTicketModalProps) {
  const { toast } = useToast()
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!ticket) return
    setTitulo(ticket.titulo)
    setDescripcion(ticket.descripcion)
    setFormError('')
  }, [ticket])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticket) return
    if (!titulo.trim() || !descripcion.trim()) {
      setFormError('El título y la descripción son obligatorios')
      return
    }

    setIsSubmitting(true)
    setFormError('')
    try {
      const updated = await editTicket(ticket._id, { titulo: titulo.trim(), descripcion: descripcion.trim() })
      toast.success('Ticket actualizado')
      onSaved(updated)
    } catch (err) {
      const msg = (axios.isAxiosError(err) ? err.response?.data?.message : undefined) || 'Error al editar el ticket'
      setFormError(msg)
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={ticket !== null} onClose={isSubmitting ? () => {} : onClose} title="Editar ticket">
      <form onSubmit={handleSubmit}>
        {formError && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded mb-4 text-sm">
            {formError}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="editar-titulo">Título</label>
            <input id="editar-titulo" type="text" value={titulo} maxLength={150} onChange={(e) => setTitulo(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="editar-descripcion">Descripción</label>
            <textarea id="editar-descripcion" value={descripcion} maxLength={5000} rows={6} onChange={(e) => setDescripcion(e.target.value)} className={`${inputClass} resize-none`} />
          </div>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          El equipo de soporte puede ver el texto anterior. Cuando empiecen a atenderlo ya no podrás editarlo; agrega lo nuevo como comentario.
        </p>
        <div className="flex gap-3 justify-end mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default EditTicketModal
