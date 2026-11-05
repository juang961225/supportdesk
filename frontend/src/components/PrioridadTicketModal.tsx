import { useState, useEffect } from 'react'
import axios from 'axios'
import Modal from './Modal'
import { updateTicketPrioridad } from '../services/ticketService'
import { useToast } from '../hooks/useToast'
import { PRIORIDADES } from '../utils/plazos'
import { DESCRIPCION_PRIORIDAD, prioridadLabel } from '../utils/ticketLabels'
import type { Prioridad, Ticket } from '../types'

interface PrioridadTicketModalProps {
  ticket: Ticket | null
  onClose: () => void
  onUpdated: (ticket: Ticket) => void
}

const campoClass =
  'w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
const MOTIVO_MAX = 300

// Admin y soporte corrigen la prioridad que eligió el usuario. Recalcula la fecha límite desde este momento
function PrioridadTicketModal({ ticket, onClose, onUpdated }: PrioridadTicketModalProps) {
  const { toast } = useToast()
  const [prioridad, setPrioridad] = useState<Prioridad | ''>('')
  const [motivo, setMotivo] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!ticket) return
    setPrioridad('')
    setMotivo('')
    setFormError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?._id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticket) return
    if (!prioridad) {
      setFormError('Selecciona la prioridad correcta')
      return
    }
    if (!motivo.trim()) {
      setFormError('El motivo es obligatorio')
      return
    }

    setIsSubmitting(true)
    setFormError('')
    try {
      const updated = await updateTicketPrioridad(ticket._id, prioridad, motivo.trim())
      toast.success(`Prioridad cambiada a ${prioridadLabel[prioridad]}`)
      onUpdated(updated)
    } catch (err) {
      const msg = (axios.isAxiosError(err) ? err.response?.data?.message : undefined) || 'Error al cambiar la prioridad'
      setFormError(msg)
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={ticket !== null} onClose={isSubmitting ? () => {} : onClose} title="Corregir prioridad">
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Prioridad actual: <span className="font-medium">{ticket ? prioridadLabel[ticket.prioridad] : ''}</span>.
        La fecha límite se recalcula con el plazo de la nueva prioridad, contando desde ahora.
      </p>
      <form onSubmit={handleSubmit}>
        {formError && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded mb-4 text-sm">
            {formError}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="corregir-prioridad">Prioridad correcta</label>
            <select
              id="corregir-prioridad"
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value as Prioridad | '')}
              className={campoClass}
            >
              <option value="">Selecciona una prioridad</option>
              {PRIORIDADES.filter((p) => p !== ticket?.prioridad).map((p) => (
                <option key={p} value={p}>{prioridadLabel[p]}</option>
              ))}
            </select>
            {prioridad && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{DESCRIPCION_PRIORIDAD[prioridad]}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="motivo-prioridad">Motivo</label>
            <textarea
              id="motivo-prioridad"
              value={motivo}
              maxLength={MOTIVO_MAX}
              rows={3}
              onChange={(e) => setMotivo(e.target.value)}
              className={`${campoClass} resize-none`}
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Queda en el historial interno. El usuario recibe un correo con la nueva prioridad, sin el motivo.
            </p>
          </div>
        </div>
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

export default PrioridadTicketModal
