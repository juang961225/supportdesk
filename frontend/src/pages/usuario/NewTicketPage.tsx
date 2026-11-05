import { ArrowLeft } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
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
import AttachmentDropZone from '../../components/AttachmentDropZone'
import type { Category, UserRef } from '../../types'
import { getSubMarcas } from '../../services/subMarcaService'
import { getMiContexto } from '../../services/catalogoService'
import { DESCRIPCION_PRIORIDAD, prioridadLabel } from '../../utils/ticketLabels'
import { getPlazos } from '../../services/horarioService'
import { formatPlazo, PRIORIDADES } from '../../utils/plazos'
import type { MiContexto, Plazos, SubMarca } from '../../types'

const MAX_TITULO = 150
const MAX_DESCRIPCION = 5000

const SIN_CONTEXTO: MiContexto = { aplica: false, todas: false, sedes: [] }

// "120 / 150": aparece al acercarse al límite
function Contador({ actual, maximo }: { actual: number; maximo: number }) {
  if (actual < maximo * 0.8) return null
  return (
    <p className={`text-xs mt-1 text-right ${actual >= maximo ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
      {actual} / {maximo}
    </p>
  )
}

function NewTicketPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [submarcas, setSubmarcas] = useState<SubMarca[]>([])
  const [miContexto, setMiContexto] = useState<MiContexto>(SIN_CONTEXTO)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [observadores, setObservadores] = useState<UserRef[]>([])
  const [archivos, setArchivos] = useState<File[]>([])
  const [relacionadas, setRelacionadas] = useState<string[]>([])
  const [plazos, setPlazos] = useState<Plazos | null>(null)

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    prioridad: 'media',
    categoriaId: '',
    submarcaId: '',
    sede: ''
  })

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const [data, misSubmarcas, contexto] = await Promise.all([getCategories(), getSubMarcas(), getMiContexto()])
        setCategories(data)
        setSubmarcas(misSubmarcas)
        setMiContexto(contexto)
        // Con una sola sub-marca se preselecciona; con varias, el usuario elige
        setFormData(prev => ({
          ...prev,
          categoriaId: '',
          submarcaId: misSubmarcas.length === 1 ? misSubmarcas[0]._id : ''
        }))
      } catch {
        toast.error('No se pudieron cargar las categorías')
      } finally {
        setIsLoading(false)
      }
    }
    fetchCategories()
    // Opcional: si no cargan, la prioridad se muestra sin el tiempo
    getPlazos().then(setPlazos).catch(() => setPlazos(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cada concesionario o importador pertenece a una sub-marca: se ofrecen los de la elegida
  const sedesDisponibles = useMemo(() => {
    if (!miContexto.aplica) return []
    const brandId = submarcas.find((s) => s._id === formData.submarcaId)?.onlineBriefId
    return brandId === undefined ? miContexto.sedes : miContexto.sedes.filter((s) => s.brandId === brandId)
  }, [miContexto, submarcas, formData.submarcaId])

  // Con una sola opción se preselecciona (un corporativo queda como "Corporativo" si no elige)
  const sedeUnica = !miContexto.todas && sedesDisponibles.length === 1 ? sedesDisponibles[0] : null
  const pideSede = miContexto.aplica && sedesDisponibles.length > 1 && !miContexto.todas

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    // Al cambiar de sub-marca, la sede elegida puede dejar de aplicar
    const cambios = e.target.name === 'submarcaId' ? { sede: '' } : {}
    if (e.target.name === 'submarcaId') setRelacionadas((prev) => prev.filter((id) => id !== e.target.value))
    setFormData({ ...formData, ...cambios, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.categoriaId) {
      toast.warning('Elige la categoría: de ella depende qué área atiende tu ticket')
      return
    }
    if (!formData.titulo || !formData.descripcion || !formData.submarcaId) {
      toast.warning('Todos los campos son obligatorios')
      return
    }

    if (pideSede && !formData.sede) {
      toast.warning('Selecciona el concesionario o importador del ticket')
      return
    }

    setIsSubmitting(true)

    try {
      await createTicket({ ...formData, submarcaRelacionadaIds: relacionadas, observadorIds: observadores.map(o => o._id), archivos })
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
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Volver
        </button>

        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
          Nuevo Ticket
        </h2>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <AttachmentDropZone files={archivos} onChange={setArchivos} disabled={isSubmitting}>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="nuevo-titulo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Título
                  </label>
                  <input
                    id="nuevo-titulo"
                    type="text"
                    maxLength={MAX_TITULO}
                    name="titulo"
                    value={formData.titulo}
                    onChange={handleChange}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Resumen del problema"
                  />
                  <Contador actual={formData.titulo.length} maximo={MAX_TITULO} />
                </div>

                <div>
                  <label htmlFor="nuevo-descripcion" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descripción
                  </label>
                  <textarea
                    id="nuevo-descripcion"
                    maxLength={MAX_DESCRIPCION}
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleChange}
                    rows={5}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Describe el problema con el mayor detalle posible..."
                  />
                  <Contador actual={formData.descripcion.length} maximo={MAX_DESCRIPCION} />
                </div>

                <div>
                  <label htmlFor="nuevo-submarca" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sub-marca
                  </label>
                  {submarcas.length === 0 ? (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      No tienes sub-marcas asignadas: pídele al administrador que te asigne al menos una para poder crear tickets.
                    </p>
                  ) : submarcas.length === 1 ? (
                    <p className="text-sm text-gray-800 dark:text-white">{submarcas[0].nombre}</p>
                  ) : (
                    <select
                      id="nuevo-submarca"
                      name="submarcaId"
                      value={formData.submarcaId}
                      onChange={handleChange}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecciona una sub-marca</option>
                      {submarcas.map((submarca) => (
                        <option key={submarca._id} value={submarca._id}>{submarca.nombre}</option>
                      ))}
                    </select>
                  )}
                </div>

                {submarcas.length > 1 && formData.submarcaId && (
                  <div>
                    <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ¿Afecta también a otras sub-marcas? <span className="font-normal text-gray-400">(opcional)</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {submarcas.filter((s) => s._id !== formData.submarcaId).map((s) => {
                        const marcada = relacionadas.includes(s._id)
                        return (
                          <button
                            key={s._id}
                            type="button"
                            aria-pressed={marcada}
                            onClick={() => setRelacionadas((prev) => (marcada ? prev.filter((id) => id !== s._id) : [...prev, s._id]))}
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
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      El ticket se cuenta en la sub-marca de arriba; estas solo ayudan a encontrarlo.
                    </p>
                  </div>
                )}

                {miContexto.aplica && formData.submarcaId && (sedesDisponibles.length > 0 || miContexto.todas) && (
                  <div>
                    <label htmlFor="nuevo-sede" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Concesionario / importador
                    </label>
                    {sedeUnica ? (
                      <p className="text-sm text-gray-800 dark:text-white">{sedeUnica.nombre}</p>
                    ) : (
                      <select
                        id="nuevo-sede"
                        name="sede"
                        value={formData.sede}
                        onChange={handleChange}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">{miContexto.todas ? 'Corporativo (general)' : 'Selecciona uno'}</option>
                        {sedesDisponibles.map((sede) => (
                          <option key={sede.clave} value={sede.clave}>{sede.nombre}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <div>
                  <label htmlFor="nuevo-categoria" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Categoría
                  </label>
                  <select
                    id="nuevo-categoria"
                    name="categoriaId"
                    value={formData.categoriaId}
                    onChange={handleChange}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecciona una categoría</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.nombre}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {categories.find((c) => c._id === formData.categoriaId)?.descripcion || 'De la categoría depende qué área atiende tu ticket.'}
                  </p>
                </div>

                <fieldset>
                  <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prioridad</legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PRIORIDADES.map((p) => {
                      const elegida = formData.prioridad === p
                      const plazo = plazos?.[p]
                      return (
                        <label
                          key={p}
                          className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            elegida
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/40'
                          }`}
                        >
                          <input
                            type="radio"
                            name="prioridad"
                            value={p}
                            checked={elegida}
                            onChange={handleChange}
                            className="mt-1"
                          />
                          <span>
                            <span className="block text-sm font-medium text-gray-800 dark:text-white">
                              {prioridadLabel[p]}
                              {plazo && (
                                <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                                  hasta {formatPlazo(plazo)}{p === 'critica' ? ' seguidas, también de noche y festivos' : ' laborales'}
                                </span>
                              )}
                            </span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{DESCRIPCION_PRIORIDAD[p]}</span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>

                <div>
                  <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Archivos (opcional)
                  </p>
                  <AttachmentInput files={archivos} onChange={setArchivos} disabled={isSubmitting} />
                </div>

                <div>
                  <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Observadores (opcional)
                  </p>
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
          </AttachmentDropZone>
        </div>
      </div>
    </Layout>
  )
}

export default NewTicketPage