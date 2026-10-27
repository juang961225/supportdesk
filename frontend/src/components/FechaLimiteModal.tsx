import { useState, useEffect } from 'react'
import axios from 'axios'
import Modal from './Modal'
import { updateFechaLimite } from '../services/ticketService'
import { useToast } from '../hooks/useToast'
import { formatFechaLimite, aFechaHoraLocal } from '../utils/fechas'
import type { Ticket } from '../types'

interface FechaLimiteModalProps {
  ticket: Ticket | null
  onClose: () => void
  onUpdated: (ticket: Ticket) => void
}

const MOTIVO_MAX = 300
const HORA_MS = 60 * 60 * 1000

const ATAJOS = [
  { label: '+4 h', ms: 4 * HORA_MS },
  { label: '+1 día', ms: 24 * HORA_MS },
  { label: '+3 días', ms: 3 * 24 * HORA_MS },
  { label: '+1 semana', ms: 7 * 24 * HORA_MS },
]

const campoClass =
  'w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'

// Solo admin: ajustar la fecha límite actual del ticket con un motivo (queda en el historial interno)
function FechaLimiteModal({ ticket, onClose, onUpdated }: FechaLimiteModalProps) {
  const { toast } = useToast()
  const [nueva, setNueva] = useState('')
  const [motivo, setMotivo] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!ticket) return
    setNueva('')
    setMotivo('')
    setFormError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?._id])

  const actual = ticket?.fechaLimite ? new Date(ticket.fechaLimite) : null
  const vencida = actual !== null && actual.getTime() < Date.now()

  // Los atajos suman sobre la fecha actual; si ya venció, sobre este momento
  const aplicarAtajo = (ms: number) => {
    const base = actual && !vencida ? actual.getTime() : Date.now()
    setNueva(aFechaHoraLocal(new Date(base + ms)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticket) return
    if (!nueva) {
      setFormError('Elige la nueva fecha límite')
      return
    }
    const fecha = new Date(nueva) // datetime-local se interpreta en la hora local
    if (fecha.getTime() <= Date.now()) {
      setFormError('La fecha límite debe ser posterior a este momento')
      return
    }
    if (!motivo.trim()) {
      setFormError('El motivo es obligatorio')
      return
    }

    setIsSubmitting(true)
    setFormError('')
    try {
      const updated = await updateFechaLimite(ticket._id, fecha.toISOString(), motivo.trim())
      toast.success('Fecha límite actualizada')
      onUpdated(updated)
    } catch (err) {
      const msg = (axios.isAxiosError(err) ? err.response?.data?.message : undefined) || 'Error al cambiar la fecha límite'
      setFormError(msg)
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={ticket !== null} onClose={isSubmitting ? () => {} : onClose} title="Editar fecha límite">
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Actual:{' '}
        <span className="font-medium">{ticket?.fechaLimite ? formatFechaLimite(ticket.fechaLimite) : 'sin fecha'}</span>
        {vencida && <span className="text-red-600 dark:text-red-400"> (vencida)</span>}
      </p>

      <form onSubmit={handleSubmit}>
        {formError && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded mb-4 text-sm">
            {formError}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-3">
          {ATAJOS.map((atajo) => (
            <button
              key={atajo.label}
              type="button"
              onClick={() => aplicarAtajo(atajo.ms)}
              className="text-xs px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {atajo.label}
            </button>
          ))}
        </div>

        <label htmlFor="nueva-fecha-limite" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Nueva fecha límite
        </label>
        <input
          id="nueva-fecha-limite"
          type="datetime-local"
          value={nueva}
          min={aFechaHoraLocal(new Date())}
          onChange={(e) => setNueva(e.target.value)}
          className={campoClass}
        />

        <label htmlFor="motivo-fecha-limite" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 mt-4">
          Motivo
        </label>
        <textarea
          id="motivo-fecha-limite"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          maxLength={MOTIVO_MAX}
          rows={3}
          placeholder="Ej: Esperando repuesto del proveedor"
          className={`${campoClass} resize-none`}
        />
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Queda en el historial interno (solo admin y soporte). {motivo.length}/{MOTIVO_MAX}
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
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default FechaLimiteModal
