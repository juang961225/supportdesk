import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import Modal from '../../components/Modal'
import { getTickets, assignTicket } from '../../services/ticketService'
import { getUsers } from '../../services/userService'
import type { Ticket, User } from '../../types'
import axios from 'axios'

// Colores reutilizables para prioridad y estado
const prioridadColor: Record<string, string> = {
  critica: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  alta: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  media: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  baja: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
}

const estadoColor: Record<string, string> = {
  abierto: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  en_progreso: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  en_revision: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  cerrado: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  reabierto: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
}

function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [soporters, setSoporters] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Estado del modal de asignación
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [selectedSoporter, setSelectedSoporter] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [ticketsData, usersData] = await Promise.all([
        getTickets(),
        getUsers()
      ])
      setTickets(ticketsData)
      // Solo los soporters pueden atender tickets
      setSoporters(usersData.filter(u => u.rol === 'soporte'))
    } catch {
      setError('Error al cargar los datos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenAssign = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setSelectedSoporter(ticket.asignadoA?._id || '')
    setIsModalOpen(true)
  }

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedSoporter) {
      setFormError('Debes seleccionar un soporter')
      return
    }

    if (!selectedTicket) return

    setIsSubmitting(true)
    setFormError('')

    try {
      const updatedTicket = await assignTicket(selectedTicket._id, selectedSoporter)
      // Actualiza el ticket en la lista sin recargar
      setTickets(tickets.map(t =>
        t._id === updatedTicket._id ? updatedTicket : t
      ))
      handleCloseModal()
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setFormError(err.response?.data?.message || 'Error al asignar el ticket')
      } else {
        setFormError('Error al asignar el ticket')
      }
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedTicket(null)
    setSelectedSoporter('')
    setFormError('')
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

  return (
    <Layout>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            Tickets
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {tickets.length} tickets en total
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded mb-4">
            {error}
          </div>
        )}

        {/* Lista de tickets */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {tickets.length === 0 ? (
              <p className="p-6 text-gray-500 dark:text-gray-400">
                No hay tickets todavía
              </p>
            ) : (
              tickets.map((ticket) => (
                <div key={ticket._id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 dark:text-white">
                        {ticket.titulo}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {ticket.creadoPor.nombre} · {ticket.categoria.nombre}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {ticket.asignadoA
                          ? `Asignado a: ${ticket.asignadoA.nombre}`
                          : 'Sin asignar'
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${prioridadColor[ticket.prioridad]}`}>
                        {ticket.prioridad}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${estadoColor[ticket.estado]}`}>
                        {ticket.estado}
                      </span>
                      <button
                        onClick={() => handleOpenAssign(ticket)}
                        className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        {ticket.asignadoA ? 'Reasignar' : 'Asignar'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de asignación */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={`${selectedTicket?.asignadoA ? 'Reasignar' : 'Asignar'} ticket`}
      >
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-medium">Ticket:</span> {selectedTicket?.titulo}
          </p>
        </div>

        <form onSubmit={handleAssign}>
          {formError && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded mb-4 text-sm">
              {formError}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Soporter
            </label>
            <select
              value={selectedSoporter}
              onChange={(e) => setSelectedSoporter(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecciona un soporter</option>
              {soporters.map((soporter) => (
                <option key={soporter._id} value={soporter._id}>
                  {soporter.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Asignando...' : 'Asignar'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}

export default TicketsPage