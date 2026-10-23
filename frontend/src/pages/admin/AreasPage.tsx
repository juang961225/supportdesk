import { useState, useEffect } from 'react'
import axios from 'axios'
import Layout from '../../components/Layout'
import { PageSkeleton } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'
import { getAreas, createArea, updateArea, updateAreaEstado } from '../../services/areaService'
import { useToast } from '../../hooks/useToast'
import type { Area } from '../../types'

const inputClass =
  'w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'

function AreasPage() {
  const { toast } = useToast()
  const [areas, setAreas] = useState<Area[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modal de crear / editar
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingArea, setEditingArea] = useState<Area | null>(null)
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Confirmación de desactivar
  const [areaToDeactivate, setAreaToDeactivate] = useState<Area | null>(null)
  const [isDeactivating, setIsDeactivating] = useState(false)

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        setAreas(await getAreas())
      } catch {
        toast.error('No se pudieron cargar las áreas')
      } finally {
        setIsLoading(false)
      }
    }
    fetchAreas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const apiError = (err: unknown, fallback: string) =>
    (axios.isAxiosError(err) ? err.response?.data?.message : undefined) || fallback

  const handleOpenCreate = () => {
    setEditingArea(null)
    setFormData({ nombre: '', descripcion: '' })
    setFormError('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (area: Area) => {
    setEditingArea(area)
    setFormData({ nombre: area.nombre, descripcion: area.descripcion || '' })
    setFormError('')
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingArea(null)
    setFormError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nombre.trim()) {
      setFormError('El nombre es obligatorio')
      toast.warning('El nombre es obligatorio')
      return
    }

    setIsSubmitting(true)
    setFormError('')
    try {
      if (editingArea) {
        const updated = await updateArea(editingArea._id, formData)
        setAreas(areas.map(a => (a._id === updated._id ? updated : a)))
        toast.success('Área actualizada')
      } else {
        const created = await createArea(formData)
        setAreas([...areas, created].sort((a, b) => a.nombre.localeCompare(b.nombre)))
        toast.success(`Área "${created.nombre}" creada`)
      }
      handleCloseModal()
    } catch (err) {
      const msg = apiError(err, 'Error al guardar el área')
      setFormError(msg)
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const changeEstado = async (area: Area, activo: boolean) => {
    try {
      const updated = await updateAreaEstado(area._id, activo)
      setAreas(areas.map(a => (a._id === updated._id ? updated : a)))
      toast.success(`Área "${area.nombre}" ${activo ? 'activada' : 'desactivada'}`)
    } catch (err) {
      toast.error(apiError(err, 'No se pudo cambiar el estado del área'))
    }
  }

  // Desactivar pide confirmación; activar es directo
  const handleToggleActive = (area: Area) => {
    if (area.activo) {
      setAreaToDeactivate(area)
    } else {
      changeEstado(area, true)
    }
  }

  const handleConfirmDeactivate = async () => {
    if (!areaToDeactivate) return
    setIsDeactivating(true)
    try {
      await changeEstado(areaToDeactivate, false)
    } finally {
      setIsDeactivating(false)
      setAreaToDeactivate(null)
    }
  }

  if (isLoading) {
    return (
      <Layout>
        <PageSkeleton variant="lista" />
      </Layout>
    )
  }

  return (
    <Layout>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Áreas</h2>
          <button
            onClick={handleOpenCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Nueva Área
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Cada categoría envía sus tickets a un área; los soportes atienden la cola de sus áreas.
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {areas.length === 0 ? (
              <EmptyState
                icon="🗂️"
                title="No hay áreas creadas"
                description="Crea al menos un área para poder enrutar los tickets por categoría."
                action={{ label: '+ Nueva Área', onClick: handleOpenCreate }}
              />
            ) : (
              areas.map((area) => (
                <div key={area._id} className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className={area.activo ? '' : 'opacity-50'}>
                    <p className="font-medium text-gray-800 dark:text-white">{area.nombre}</p>
                    {area.descripcion && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{area.descripcion}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      area.activo
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {area.activo ? 'Activa' : 'Inactiva'}
                    </span>
                    <button
                      onClick={() => handleOpenEdit(area)}
                      className="text-xs px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleToggleActive(area)}
                      className={`text-xs px-3 py-1 rounded transition-colors ${
                        area.activo
                          ? 'border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20'
                          : 'border border-green-300 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20'
                      }`}
                    >
                      {area.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingArea ? 'Editar Área' : 'Nueva Área'}>
        <form onSubmit={handleSubmit}>
          {formError && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded mb-4 text-sm">
              {formError}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className={inputClass}
                placeholder="Ej: Conexiones, Nivel 1..."
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción (opcional)</label>
              <input
                type="text"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-6">
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
              {isSubmitting ? 'Guardando...' : editingArea ? 'Guardar cambios' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={areaToDeactivate !== null}
        title="Desactivar área"
        message={
          <>
            El área <span className="font-medium">"{areaToDeactivate?.nombre}"</span> no podrá usarse en
            categorías nuevas. Solo se puede desactivar si no tiene categorías activas ni tickets abiertos.
          </>
        }
        confirmLabel="Desactivar"
        isLoading={isDeactivating}
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setAreaToDeactivate(null)}
      />
    </Layout>
  )
}

export default AreasPage
