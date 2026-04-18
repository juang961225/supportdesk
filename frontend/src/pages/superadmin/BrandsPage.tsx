import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import Modal from '../../components/Modal'
import { getBrands, createBrand } from '../../services/brandService'
import type { Brand } from '../../types'

function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Estado del modal
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Estado del formulario
  const [nombre, setNombre] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    fetchBrands()
  }, [])

  const fetchBrands = async () => {
    try {
      const data = await getBrands()
      setBrands(data)
    } catch {
      setError('Error al cargar las marcas')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) {
      setFormError('El nombre es obligatorio')
      return
    }

    setIsSubmitting(true)
    setFormError('')

    try {
      const newBrand = await createBrand(nombre)
      setBrands([newBrand, ...brands]) // agrega al inicio de la lista
      setNombre('')
      setIsModalOpen(false)
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Error al crear la marca')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setNombre('')
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
        {/* Header de la página */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            Marcas
          </h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Nueva Marca
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded mb-4">
            {error}
          </div>
        )}

        {/* Lista de marcas */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
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
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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

      {/* Modal para crear marca */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Nueva Marca"
      >
        <form onSubmit={handleCreateBrand}>
          {formError && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded mb-4 text-sm">
              {formError}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre de la marca
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: BMW, BAT..."
              autoFocus
            />
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
              {isSubmitting ? 'Creando...' : 'Crear Marca'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}

export default BrandsPage