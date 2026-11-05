import { useState, useEffect } from 'react'
import axios from 'axios'
import Modal from './Modal'
import { updateTicketCategoria } from '../services/ticketService'
import { getCategories } from '../services/categoryService'
import { useToast } from '../hooks/useToast'
import type { Category, Ticket } from '../types'

interface CategoriaTicketModalProps {
  ticket: Ticket | null
  onClose: () => void
  onUpdated: (ticket: Ticket) => void
}

const selectClass =
  'w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'

// Admin y soporte corrigen la categoría: solo cambia la clasificación, no el área ni la fecha límite
function CategoriaTicketModal({ ticket, onClose, onUpdated }: CategoriaTicketModalProps) {
  const { toast } = useToast()
  const [categorias, setCategorias] = useState<Category[]>([])
  const [selected, setSelected] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!ticket) return
    setSelected('')
    setFormError('')
    getCategories()
      .then((data) => setCategorias(data.filter((c) => c.activo && c._id !== ticket.categoria._id)))
      .catch(() => toast.error('No se pudieron cargar las categorías'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?._id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticket) return
    if (!selected) {
      setFormError('Selecciona la categoría correcta')
      return
    }

    setIsSubmitting(true)
    setFormError('')
    try {
      const updated = await updateTicketCategoria(ticket._id, selected)
      toast.success(`Categoría cambiada a ${updated.categoria.nombre}`)
      onUpdated(updated)
    } catch (err) {
      const msg = (axios.isAxiosError(err) ? err.response?.data?.message : undefined) || 'Error al cambiar la categoría'
      setFormError(msg)
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={ticket !== null} onClose={isSubmitting ? () => {} : onClose} title="Corregir categoría">
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Categoría actual: <span className="font-medium">{ticket?.categoria.nombre}</span>. El ticket sigue en{' '}
        <span className="font-medium">{ticket?.area?.nombre ?? 'su área'}</span>, con la misma fecha límite. Para cambiarlo de área usa "Mover de área".
      </p>
      <form onSubmit={handleSubmit}>
        {formError && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded mb-4 text-sm">
            {formError}
          </div>
        )}
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="corregir-categoria">Categoría correcta</label>
        <select id="corregir-categoria" value={selected} onChange={(e) => setSelected(e.target.value)} className={selectClass}>
          <option value="">Selecciona una categoría</option>
          {categorias.map((c) => (
            <option key={c._id} value={c._id}>{c.nombre}</option>
          ))}
        </select>
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
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default CategoriaTicketModal
