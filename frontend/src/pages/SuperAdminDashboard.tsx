import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { getBrands } from '../services/brandService'
import { getUsers } from '../services/userService'
import type { Brand } from '../services/brandService'
import type { User } from '../services/userService'

function SuperAdminDashboard() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Llama las dos APIs al mismo tiempo
        const [brandsData, usersData] = await Promise.all([
          getBrands(),
          getUsers()
        ])
        setBrands(brandsData)
        setUsers(usersData)
      } catch {
        setError('Error al cargar los datos')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, []) // ← array vacío = solo se ejecuta al montar

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500 dark:text-gray-400">Cargando...</p>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded">
          {error}
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div>
        {/* Título */}
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
          Dashboard
        </h2>

        {/* Tarjetas de resumen */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Marcas</p>
            <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">
              {brands.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Usuarios</p>
            <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">
              {users.length}
            </p>
          </div>
        </div>

        {/* Lista de marcas */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              Marcas
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {brands.length === 0 ? (
              <p className="p-6 text-gray-500 dark:text-gray-400">
                No hay marcas creadas
              </p>
            ) : (
              brands.map((brand) => (
                <div key={brand._id} className="p-6 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">
                      {brand.nombre}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {brand.admin ? brand.admin.nombre : 'Sin admin asignado'}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    brand.estado === 'activo'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  }`}>
                    {brand.estado}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default SuperAdminDashboard