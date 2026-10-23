import { useState, useEffect } from 'react'
import axios from 'axios'
import Modal from './Modal'
import { assignTicket } from '../services/ticketService'
import { getAreaSoportes } from '../services/areaService'
import { useToast } from '../hooks/useToast'
import type { Ticket, User } from '../types'

interface AssignTicketModalProps {
  ticket: Ticket | null
  title: string
  excludeUserId?: string // ej. el propio soporte al pasar el ticket
  onClose: () => void
  onAssigned: (ticket: Ticket) => void
}

const selectClass =
  'w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'

// Asignar (admin) o pasar a un compañero (soporte): solo soportes activos del área del ticket
function AssignTicketModal({ ticket, title, excludeUserId, onClose, onAssigned }: AssignTicketModalProps) {
  const { toast } = useToast()
  const [soportes, setSoportes] = useState<User[]>([])
  const [selected, setSelected] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!ticket?.area) return
    setSelected('')
    setFormError('')
    setIsLoading(true)
    getAreaSoportes(ticket.area._id)
      .then((data) => setSoportes(data.filter((s) => s._id !== excludeUserId && s._id !== ticket.asignadoA?._id)))
      .catch(() => toast.error('No se pudieron cargar los soportes del área'))
      .finally(() => setIsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?._id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticket) return
    if (!selected) {
      setFormError('Selecciona un soporte')
      return
    }

    setIsSubmitting(true)
    setFormError('')
    try {
      const updated = await assignTicket(ticket._id, selected)
      toast.success(`Ticket asignado a ${updated.asignadoA?.nombre ?? 'soporte'}`)
      onAssigned(updated)
    } catch (err) {
      const msg = (axios.isAxiosError(err) ? err.response?.data?.message : undefined) || 'Error al asignar el ticket'
      setFormError(msg)
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={ticket !== null} onClose={onClose} title={title}>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        <span className="font-medium">Ticket:</span> {ticket?.titulo}
        <br />
        <span className="font-medium">Área:</span> {ticket?.area?.nombre ?? 'Sin área'}
      </p>

      <form onSubmit={handleSubmit}>
        {formError && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded mb-4 text-sm">
            {formError}
          </div>
        )}

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Soporte del área</label>
        {isLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Cargando soportes...</p>
        ) : soportes.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No hay otros soportes activos en esta área.</p>
        ) : (
          <select value={selected} onChange={(e) => setSelected(e.target.value)} className={selectClass}>
            <option value="">Selecciona un soporte</option>
            {soportes.map((s) => (
              <option key={s._id} value={s._id}>{s.nombre}</option>
            ))}
          </select>
        )}

        <div className="flex gap-3 justify-end mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || soportes.length === 0}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Asignando...' : 'Asignar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default AssignTicketModal
