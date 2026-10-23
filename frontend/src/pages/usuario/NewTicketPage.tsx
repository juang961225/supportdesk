import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Layout from '../../components/Layout'
import { PageSkeleton } from '../../components/Skeleton'
import { createTicket } from '../../services/ticketService'
import { getCategories } from '../../services/categoryService'
import { useToast } from '../../hooks/useToast'
import { useAuth } from '../../hooks/useAuth'
import ObserverSearchInput from '../../components/ObserverSearchInput'
import AttachmentInput from '../../components/AttachmentInput'
import type { Category, UserRef } from '../../types'

function NewTicketPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [observadores, setObservadores] = useState<UserRef[]>([])
  const [archivos, setArchivos] = useState<File[]>([])

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
      } catch {
        toast.error('No se pudieron cargar las categorías')
      } finally {
        setIsLoading(false)
      }
    }
    fetchCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.titulo || !formData.descripcion || !formData.categoriaId) {
      toast.warning('Todos los campos son obligatorios')
      return
    }

    setIsSubmitting(true)

    try {
      await createTicket({ ...formData, observadorIds: observadores.map(o => o._id), archivos })
      toast.success(`Ticket "${formData.titulo}" creado correctamente`)
      navigate('/usuario/dashboard')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || 'Error al crear el ticket')
      } else {
        toast.error('Error al crear el ticket')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <Layout>
        <PageSkeleton variant="formulario" />
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Archivos (opcional)
                </label>
                <AttachmentInput files={archivos} onChange={setArchivos} disabled={isSubmitting} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Observadores (opcional)
                </label>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                  Personas de tu marca que podrán ver el ticket y comentar, por ejemplo tu jefe. Búscalas por nombre o correo.
                </p>
                <ObserverSearchInput
                  excludeIds={[...(user?._id ? [user._id] : []), ...observadores.map(o => o._id)]}
                  onSelect={(found) => setObservadores([...observadores, found])}
                />
                {observadores.length > 0 && (
                  <ul className="flex flex-wrap gap-2 mt-2">
                    {observadores.map((o) => (
                      <li
                        key={o._id}
                        className="flex items-center gap-2 text-sm px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        {o.nombre}
                        <button
                          type="button"
                          onClick={() => setObservadores(observadores.filter(x => x._id !== o._id))}
                          className="text-xs text-red-600 dark:text-red-400 hover:underline"
                        >
                          Quitar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
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