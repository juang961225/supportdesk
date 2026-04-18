import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { getTickets } from '../../services/ticketService'
import { getUsers } from '../../services/userService'
import type { Ticket } from '../../types'

function AdminDashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ticketsData, usersData] = await Promise.all([
          getTickets(),
          getUsers()
        ])
        setTickets(ticketsData)
        setTotalUsers(usersData.length)
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  // Métricas calculadas del lado del cliente
  const abiertos = tickets.filter(t => t.estado === 'abierto').length
  const enProgreso = tickets.filter(t => t.estado === 'en_progreso').length
  const cerrados = tickets.filter(t => t.estado === 'cerrado').length
  const criticos = tickets.filter(t => t.prioridad === 'critica').length

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
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
          Dashboard
        </h2>

        {/* Tarjetas de métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Abiertos</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {abiertos}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">En progreso</p>
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
              {enProgreso}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Cerrados</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
              {cerrados}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Críticos</p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
              {criticos}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Usuarios</p>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">
              {totalUsers}
            </p>
          </div>
        </div>

        {/* Tickets recientes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              Tickets recientes
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {tickets.length === 0 ? (
              <p className="p-6 text-gray-500 dark:text-gray-400">
                No hay tickets todavía
              </p>
            ) : (
              tickets.slice(0, 5).map((ticket) => (
                <div key={ticket._id} className="p-6 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">
                      {ticket.titulo}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {ticket.creadoPor.nombre} · {ticket.categoria.nombre}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      ticket.prioridad === 'critica'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        : ticket.prioridad === 'alta'
                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                        : ticket.prioridad === 'media'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      {ticket.prioridad}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      ticket.estado === 'abierto'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : ticket.estado === 'en_progreso'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        : ticket.estado === 'cerrado'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      {ticket.estado}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default AdminDashboard