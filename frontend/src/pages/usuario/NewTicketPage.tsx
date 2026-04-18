import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Layout from '../../components/Layout'
import { createTicket } from '../../services/ticketService'
import { getCategories } from '../../services/categoryService'
import type { Category } from '../../types'

function NewTicketPage() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    prioridad: 'media',
    categoriaId: ''
  })

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories()
        setCategories(data)
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, categoriaId: data[0]._id }))
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCategories()
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.titulo || !formData.descripcion || !formData.categoriaId) {
      setError('Todos los campos son obligatorios')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await createTicket(formData)
      navigate('/usuario/dashboard')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Error al crear el ticket')
      } else {
        setError('Error al crear el ticket')
      }
    } finally {
      setIsSubmitting(false)
    }
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
      <div className="max-w-2xl">
        <button
          onClick={() => navigate('/usuario/dashboard')}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-6 flex items-center gap-1"
        >
          ← Volver
        </button>

        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
          Nuevo Ticket
        </h2>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Título
                </label>
                <input
                  type="text"
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Resumen del problema"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleChange}
                  rows={5}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Describe el problema con el mayor detalle posible..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Categoría
                  </label>
                  <select
                    name="categoriaId"
                    value={formData.categoriaId}
                    onChange={handleChange}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prioridad
                  </label>
                  <select
                    name="prioridad"
                    value={formData.prioridad}
                    onChange={handleChange}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={() => navigate('/usuario/dashboard')}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Creando...' : 'Crear Ticket'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}

export default NewTicketPage