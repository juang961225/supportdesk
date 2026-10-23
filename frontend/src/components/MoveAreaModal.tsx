import { useState, useEffect } from 'react'
import axios from 'axios'
import Modal from './Modal'
import { moveTicket } from '../services/ticketService'
import { getAreas } from '../services/areaService'
import { useToast } from '../hooks/useToast'
import type { Ticket, Area } from '../types'

interface MoveAreaModalProps {
  ticket: Ticket | null
  onClose: () => void
  onMoved: (ticket: Ticket) => void
}

const selectClass =
  'w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'

// Mover un ticket a otra área: conserva la categoría, queda sin asignar y con nueva fecha límite
function MoveAreaModal({ ticket, onClose, onMoved }: MoveAreaModalProps) {
  const { toast } = useToast()
  const [areas, setAreas] = useState<Area[]>([])
  const [selected, setSelected] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!ticket) return
    setSelected('')
    setFormError('')
    getAreas()
      .then((data) => setAreas(data.filter((a) => a.activo && a._id !== ticket.area?._id)))
      .catch(() => toast.error('No se pudieron cargar las áreas'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?._id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticket) return
    if (!selected) {
      setFormError('Selecciona el área destino')
      return
    }

    setIsSubmitting(true)
    setFormError('')
    try {
      const updated = await moveTicket(ticket._id, selected)
      toast.success(`Ticket movido a ${updated.area?.nombre ?? 'otra área'}`)
      onMoved(updated)
    } catch (err) {
      const msg = (axios.isAxiosError(err) ? err.response?.data?.message : undefined) || 'Error al mover el ticket'
      setFormError(msg)
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={ticket !== null} onClose={isSubmitting ? () => {} : onClose} title="Mover de área">
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        El ticket <span className="font-medium">"{ticket?.titulo}"</span> sale de{' '}
        <span className="font-medium">{ticket?.area?.nombre ?? 'su área'}</span> y llega{' '}
        <span className="font-medium">sin asignar</span> a la cola del área destino, con una nueva fecha límite.
        La categoría no cambia.
      </p>

      <form onSubmit={handleSubmit}>
        {formError && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded mb-4 text-sm">
            {formError}
          </div>
        )}

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Área destino</label>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className={selectClass}>
          <option value="">Selecciona un área</option>
          {areas.map((a) => (
            <option key={a._id} value={a._id}>{a.nombre}</option>
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
            className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Moviendo...' : 'Mover'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default MoveAreaModal
