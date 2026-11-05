import { useState, useEffect } from 'react'
import axios from 'axios'
import Modal from './Modal'
import { updateTicketSubmarcas } from '../services/ticketService'
import { getSubMarcas } from '../services/subMarcaService'
import { useToast } from '../hooks/useToast'
import type { SubMarca, Ticket } from '../types'

interface SubmarcasTicketModalProps {
  ticket: Ticket | null
  onClose: () => void
  onUpdated: (ticket: Ticket) => void
}

// Admin y soporte corrigen las sub-marcas relacionadas. La principal no cambia
function SubmarcasTicketModal({ ticket, onClose, onUpdated }: SubmarcasTicketModalProps) {
  const { toast } = useToast()
  const [opciones, setOpciones] = useState<SubMarca[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!ticket) return
    const actuales = (ticket.submarcasRelacionadas ?? []).map((s) => s._id)
    setSelected(actuales)
    setFormError('')
    getSubMarcas()
      // Las activas de la marca, sin la principal; las que ya tenía se muestran aunque se hayan desactivado
      .then((data) => setOpciones(data.filter((s) => s._id !== ticket.submarca?._id && (s.activo || actuales.includes(s._id)))))
      .catch(() => toast.error('No se pudieron cargar las sub-marcas'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?._id])

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticket) return
    setIsSubmitting(true)
    setFormError('')
    try {
      const updated = await updateTicketSubmarcas(ticket._id, selected)
      toast.success('Sub-marcas relacionadas actualizadas')
      onUpdated(updated)
    } catch (err) {
      const msg = (axios.isAxiosError(err) ? err.response?.data?.message : undefined) || 'Error al guardar las sub-marcas'
      setFormError(msg)
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={ticket !== null} onClose={isSubmitting ? () => {} : onClose} title="Sub-marcas relacionadas">
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Principal: <span className="font-medium">{ticket?.submarca?.nombre ?? 'Sin sub-marca'}</span>. Las gráficas, los totales y el
        concesionario siguen contando solo la principal; las relacionadas sirven para encontrar el ticket al filtrar.
      </p>
      <form onSubmit={handleSubmit}>
        {formError && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded mb-4 text-sm">
            {formError}
          </div>
        )}
        {opciones.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">No hay otras sub-marcas activas en la marca.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {opciones.map((s) => {
              const marcada = selected.includes(s._id)
              return (
                <button
                  key={s._id}
                  type="button"
                  aria-pressed={marcada}
                  onClick={() => toggle(s._id)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    marcada
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {s.nombre}
                </button>
              )
            })}
          </div>
        )}
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

export default SubmarcasTicketModal
