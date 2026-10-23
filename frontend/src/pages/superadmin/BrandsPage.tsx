import { useState, useEffect } from 'react'
import axios from 'axios'
import Layout from '../../components/Layout'
import EmptyState from '../../components/EmptyState'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'
import { getBrands, createBrand, updateBrand } from '../../services/brandService'
import { useToast } from '../../hooks/useToast'
import type { Brand } from '../../types'

function BrandsPage() {
  const { toast } = useToast()
  const [brands, setBrands] = useState<Brand[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Estado del modal
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Estado del formulario
  const [nombre, setNombre] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Estado de la confirmación de desactivar
  const [brandToDeactivate, setBrandToDeactivate] = useState<Brand | null>(null)
  const [isDeactivating, setIsDeactivating] = useState(false)

  useEffect(() => {
    fetchBrands()
  }, [])

  const fetchBrands = async () => {
    try {
      const data = await getBrands()
      setBrands(data)
    } catch {
      setError('Error al cargar las marcas')
      toast.error('No se pudieron cargar las marcas')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) {
      setFormError('El nombre es obligatorio')
      toast.warning('El nombre es obligatorio')
      return
    }

    setIsSubmitting(true)
    setFormError('')

    try {
      const newBrand = await createBrand(nombre)
      setBrands([newBrand, ...brands]) // agrega al inicio de la lista
      toast.success(`Marca "${newBrand.nombre}" creada`)
      setNombre('')
      setIsModalOpen(false)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message || 'Error al crear la marca'
        setFormError(msg)
        toast.error(msg)
      } else {
        setFormError('Error al crear la marca')
        toast.error('Error al crear la marca')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const changeEstado = async (brand: Brand, estado: Brand['estado']) => {
    try {
      const updated = await updateBrand(brand._id, { estado })
      // El backend no devuelve el admin poblado: solo actualizamos el estado de la fila
      setBrands(brands.map(b => (b._id === brand._id ? { ...b, estado: updated.estado } : b)))
      toast.success(`Marca "${brand.nombre}" ${estado === 'activo' ? 'reactivada' : 'desactivada'}`)
    } catch (err) {
      const apiMsg = axios.isAxiosError(err) ? err.response?.data?.message : undefined
      toast.error(apiMsg || 'No se pudo cambiar el estado de la marca')
    }
  }

  // Desactivar pide confirmación; reactivar es directo
  const handleToggleEstado = (brand: Brand) => {
    if (brand.estado === 'activo') {
      setBrandToDeactivate(brand)
    } else {
      changeEstado(brand, 'activo')
    }
  }

  const handleConfirmDeactivate = async () => {
    if (!brandToDeactivate) return
    setIsDeactivating(true)
    try {
      await changeEstado(brandToDeactivate, 'inactivo')
    } finally {
      setIsDeactivating(false)
      setBrandToDeactivate(null)
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
              <EmptyState
                icon="🏢"
                title="No hay marcas creadas"
                description="Cada marca tiene sus propios usuarios, áreas y tickets."
                action={{ label: '+ Nueva Marca', onClick: () => setIsModalOpen(true) }}
              />
            ) : (
              brands.map((brand) => (
                <div key={brand._id} className="p-6 flex items-center justify-between">
                  <div className={brand.estado === 'inactivo' ? 'opacity-50' : ''}>
                    <p className="font-medium text-gray-800 dark:text-white">
                      {brand.nombre}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {brand.admin ? brand.admin.nombre : 'Sin admin asignado'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      brand.estado === 'activo'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {brand.estado}
                    </span>
                    <button
                      onClick={() => handleToggleEstado(brand)}
                      className={`text-xs px-3 py-1 rounded transition-colors ${
                        brand.estado === 'activo'
                          ? 'border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20'
                          : 'border border-green-300 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20'
                      }`}
                    >
                      {brand.estado === 'activo' ? 'Desactivar' : 'Reactivar'}
                    </button>
                  </div>
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

      <ConfirmDialog
        isOpen={brandToDeactivate !== null}
        title="Desactivar marca"
        message={
          <>
            Todos los usuarios de <span className="font-medium">"{brandToDeactivate?.nombre}"</span> perderán
            el acceso. Los datos se conservan y podrás reactivarla después.
          </>
        }
        confirmLabel="Desactivar"
        isLoading={isDeactivating}
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setBrandToDeactivate(null)}
      />
    </Layout>
  )
}

export default BrandsPage