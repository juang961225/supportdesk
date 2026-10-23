import { useState } from 'react'
import axios from 'axios'
import ConfirmDialog from './ConfirmDialog'
import ObserverSearchInput from './ObserverSearchInput'
import { addObserver, removeObserver } from '../services/ticketService'
import { useToast } from '../hooks/useToast'
import type { Ticket, UserRef } from '../types'

interface ObserversPanelProps {
  ticket: Ticket
  currentUserId?: string
  canManage: boolean // creador o admin
  onUpdated: (ticket: Ticket | null) => void // null: el usuario actual dejó de seguir el ticket
}

// Observadores del ticket: ven y comentan. Gestionan el creador y el admin; el observador puede salirse.
function ObserversPanel({ ticket, currentUserId, canManage, onUpdated }: ObserversPanelProps) {
  const { toast } = useToast()
  const [toRemove, setToRemove] = useState<UserRef | null>(null)
  const [isWorking, setIsWorking] = useState(false)

  const observadores = ticket.observadores ?? []
  const esObservador = observadores.some((o) => o._id === currentUserId)
  const cerrado = ticket.estado === 'cerrado'

  const apiError = (err: unknown, fallback: string) =>
    (axios.isAxiosError(err) ? err.response?.data?.message : undefined) || fallback

  const handleAdd = async (user: UserRef) => {
    setIsWorking(true)
    try {
      onUpdated(await addObserver(ticket._id, user._id))
      toast.success(`${user.nombre} ahora sigue el ticket`)
    } catch (err) {
      toast.error(apiError(err, 'No se pudo agregar el observador'))
    } finally {
      setIsWorking(false)
    }
  }

  const handleConfirmRemove = async () => {
    if (!toRemove) return
    const seSale = toRemove._id === currentUserId
    setIsWorking(true)
    try {
      const updated = await removeObserver(ticket._id, toRemove._id)
      toast.success(seSale ? 'Dejaste de seguir el ticket' : `${toRemove.nombre} ya no sigue el ticket`)
      onUpdated(updated)
    } catch (err) {
      toast.error(apiError(err, 'No se pudo quitar el observador'))
    } finally {
      setIsWorking(false)
      setToRemove(null)
    }
  }

  // Sin observadores y sin permiso para agregar: no hay nada que mostrar
  if (observadores.length === 0 && !canManage) return null

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Observadores</p>

      {observadores.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">Nadie más sigue este ticket.</p>
      ) : (
        <ul className="flex flex-wrap gap-2 mb-3">
          {observadores.map((o) => (
            <li
              key={o._id}
              className="flex items-center gap-2 text-sm px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              title={o.email}
            >
              {o.nombre}
              {(canManage || o._id === currentUserId) && (
                <button
                  onClick={() => setToRemove(o)}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline"
                >
                  {o._id === currentUserId ? 'Salir' : 'Quitar'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && !cerrado && (
        <ObserverSearchInput
          excludeIds={[ticket.creadoPor._id, ...observadores.map((o) => o._id)]}
          onSelect={handleAdd}
          disabled={isWorking}
        />
      )}

      {esObservador && !canManage && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Sigues este ticket como observador: puedes verlo y comentar.
        </p>
      )}

      <ConfirmDialog
        isOpen={toRemove !== null}
        title={toRemove?._id === currentUserId ? 'Dejar de seguir' : 'Quitar observador'}
        message={
          toRemove?._id === currentUserId
            ? 'Ya no verás este ticket ni podrás comentar en él.'
            : `${toRemove?.nombre} ya no podrá ver ni comentar este ticket.`
        }
        confirmLabel={toRemove?._id === currentUserId ? 'Dejar de seguir' : 'Quitar'}
        isLoading={isWorking}
        onConfirm={handleConfirmRemove}
        onCancel={() => setToRemove(null)}
      />
    </div>
  )
}

export default ObserversPanel
