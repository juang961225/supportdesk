import { useState, useEffect } from 'react'
import axios from 'axios'
import Layout from '../../components/Layout'
import { PageSkeleton } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'
import { getSubMarcas, createSubMarca, updateSubMarca, updateSubMarcaEstado } from '../../services/subMarcaService'
import { getCatalogoContexto } from '../../services/catalogoService'
import { useToast } from '../../hooks/useToast'
import type { CatalogoContexto, SubMarca } from '../../types'

const inputClass =
  'w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'

function SubMarcasPage() {
  const { toast } = useToast()
  const [submarcas, setSubmarcas] = useState<SubMarca[]>([])
  const [catalogo, setCatalogo] = useState<CatalogoContexto>()
  const [isLoading, setIsLoading] = useState(true)

  // Modal de crear / editar
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<SubMarca | null>(null)
  const [nombre, setNombre] = useState('')
  const [organizaciones, setOrganizaciones] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Confirmación de desactivar
  const [toDeactivate, setToDeactivate] = useState<SubMarca | null>(null)
  const [isDeactivating, setIsDeactivating] = useState(false)

  useEffect(() => {
    const fetchSubmarcas = async () => {
      try {
        const [lista, catalogoContexto] = await Promise.all([getSubMarcas(), getCatalogoContexto()])
        setSubmarcas(lista)
        setCatalogo(catalogoContexto)
      } catch {
        toast.error('No se pudieron cargar las sub-marcas')
      } finally {
        setIsLoading(false)
      }
    }
    fetchSubmarcas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const apiError = (err: unknown, fallback: string) =>
    (axios.isAxiosError(err) ? err.response?.data?.message : undefined) || fallback

  const handleOpenCreate = () => {
    setEditing(null)
    setNombre('')
    setOrganizaciones([])
    setFormError('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (submarca: SubMarca) => {
    setEditing(submarca)
    setNombre(submarca.nombre)
    setOrganizaciones(submarca.organizaciones ?? [])
    setFormError('')
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditing(null)
    setFormError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) {
      setFormError('El nombre es obligatorio')
      toast.warning('El nombre es obligatorio')
      return
    }

    setIsSubmitting(true)
    setFormError('')
    try {
      if (editing) {
        const updated = await updateSubMarca(editing._id, nombre, catalogo?.disponible ? organizaciones : undefined)
        setSubmarcas(submarcas.map(s => (s._id === updated._id ? updated : s)))
        toast.success('Sub-marca actualizada')
      } else {
        const created = await createSubMarca(nombre, catalogo?.disponible ? organizaciones : undefined)
        setSubmarcas([...submarcas, created].sort((a, b) => a.nombre.localeCompare(b.nombre)))
        toast.success(`Sub-marca "${created.nombre}" creada`)
      }
      handleCloseModal()
    } catch (err) {
      const msg = apiError(err, 'Error al guardar la sub-marca')
      setFormError(msg)
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const changeEstado = async (submarca: SubMarca, activo: boolean) => {
    try {
      const updated = await updateSubMarcaEstado(submarca._id, activo)
      setSubmarcas(submarcas.map(s => (s._id === updated._id ? updated : s)))
      toast.success(`Sub-marca "${submarca.nombre}" ${activo ? 'activada' : 'desactivada'}`)
    } catch (err) {
      toast.error(apiError(err, 'No se pudo cambiar el estado de la sub-marca'))
    }
  }

  // Desactivar pide confirmación; activar es directo
  const handleToggleActive = (submarca: SubMarca) => {
    if (submarca.activo) {
      setToDeactivate(submarca)
    } else {
      changeEstado(submarca, true)
    }
  }

  const handleConfirmDeactivate = async () => {
    if (!toDeactivate) return
    setIsDeactivating(true)
    try {
      await changeEstado(toDeactivate, false)
    } finally {
      setIsDeactivating(false)
      setToDeactivate(null)
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
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Sub-marcas</h2>
          <button
            onClick={handleOpenCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Nueva Sub-marca
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Cada ticket pertenece a una sub-marca; cada usuario solo crea tickets de las que tiene asignadas.
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {submarcas.length === 0 ? (
              <EmptyState
                icon="🏷️"
                title="No hay sub-marcas creadas"
                description="Crea al menos una para que los usuarios puedan crear tickets."
                action={{ label: '+ Nueva Sub-marca', onClick: handleOpenCreate }}
              />
            ) : (
              submarcas.map((submarca) => (
                <div key={submarca._id} className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className={submarca.activo ? '' : 'opacity-50'}>
                    <p className="font-medium text-gray-800 dark:text-white">{submarca.nombre}</p>
                    {catalogo?.disponible && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {submarca.organizaciones?.length
                          ? `Solo: ${catalogo.organizaciones.filter((o) => submarca.organizaciones?.includes(o.id)).map((o) => o.nombre).join(', ')}`
                          : 'Todas las organizaciones'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      submarca.activo
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {submarca.activo ? 'Activa' : 'Inactiva'}
                    </span>
                    <button
                      onClick={() => handleOpenEdit(submarca)}
                      className="text-xs px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleToggleActive(submarca)}
                      className={`text-xs px-3 py-1 rounded transition-colors ${
                        submarca.activo
                          ? 'border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20'
                          : 'border border-green-300 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20'
                      }`}
                    >
                      {submarca.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editing ? 'Editar Sub-marca' : 'Nueva Sub-marca'}>
        <form onSubmit={handleSubmit}>
          {formError && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded mb-4 text-sm">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputClass}
              placeholder="Ej: BMW, MINI..."
              autoFocus
            />
          </div>
          {catalogo?.disponible && (
            <div className="mt-4">
              <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Organizaciones donde aplica</p>
              <div className="flex flex-wrap gap-3">
                {catalogo.organizaciones.map((org) => (
                  <label key={org.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={organizaciones.includes(org.id)}
                      onChange={(e) => setOrganizaciones(e.target.checked ? [...organizaciones, org.id] : organizaciones.filter((o) => o !== org.id))}
                    />
                    {org.nombre}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Si no marcas ninguna, aplica a todas. Los usuarios de otras organizaciones no podrán crear tickets de esta sub-marca.
              </p>
            </div>
          )}
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
              {isSubmitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={toDeactivate !== null}
        title="Desactivar sub-marca"
        message={
          <>
            No se podrán crear tickets nuevos de <span className="font-medium">"{toDeactivate?.nombre}"</span>.
            Los tickets que ya la tienen la conservan.
          </>
        }
        confirmLabel="Desactivar"
        isLoading={isDeactivating}
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setToDeactivate(null)}
      />
    </Layout>
  )
}

export default SubMarcasPage
