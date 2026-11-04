import { useState, useEffect } from 'react'
import axios from 'axios'
import Layout from '../../components/Layout'
import { PageSkeleton } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'
import EditUserModal from '../../components/EditUserModal'
import AreaSelector from '../../components/AreaSelector'
import { getAreas } from '../../services/areaService'
import { getSubMarcas } from '../../services/subMarcaService'
import SubMarcaSelector from '../../components/SubMarcaSelector'
import ContextoSelector from '../../components/ContextoSelector'
import { getCatalogoContexto } from '../../services/catalogoService'
import { getUsersPage, createUser, updateUser } from '../../services/userService'
import { useToast } from '../../hooks/useToast'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import Pagination from '../../components/Pagination'
import { rolLabel, cuentaEstadoLabel } from '../../utils/userLabels'
import type { User, Area, SubMarca, CatalogoContexto, ContextoUsuario } from '../../types'

const CONTEXTO_INICIAL: ContextoUsuario = { organizaciones: [], sedes: [], todosConcesionarios: false, todosImportadores: false }

// "MX · 3 sedes" en la fila del usuario
const resumenContexto = (user: User, catalogo: CatalogoContexto): string => {
  const organizaciones = catalogo.organizaciones.filter(o => user.organizaciones?.includes(o.id)).map(o => o.nombre)
  if (organizaciones.length === 0) return 'Sin organización'
  const todas = user.todosConcesionarios || user.todosImportadores
  const cantidad = user.sedes?.length ?? 0
  return `${organizaciones.join(', ')} · ${todas ? 'corporativo' : cantidad === 1 ? '1 concesionario o importador' : `${cantidad} concesionarios o importadores`}`
}

const rolColor: Record<string, string> = {
  admin: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  soporte: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  usuario: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
}

function AdminUsersPage() {
  const { toast } = useToast()
  // El backend ya filtra por la marca del admin (el superadmin no tiene marca, no aparece)
  const {
    items: users, setItems: setUsers, pagination, setPage, isLoading, isFetching, error, recargarDesdeInicio
  } = usePaginatedList<User>(getUsersPage, () => toast.error('No se pudieron cargar los usuarios'))
  const [areas, setAreas] = useState<Area[]>([])
  const [newAreaIds, setNewAreaIds] = useState<string[]>([])
  const [submarcas, setSubmarcas] = useState<SubMarca[]>([])
  const [newSubmarcaIds, setNewSubmarcaIds] = useState<string[]>([])
  const [catalogo, setCatalogo] = useState<CatalogoContexto>()
  const [newContexto, setNewContexto] = useState<ContextoUsuario>(CONTEXTO_INICIAL)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'soporte',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Edición y desactivación
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null)
  const [isDeactivating, setIsDeactivating] = useState(false)

  // Áreas completas para el selector del formulario
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const [listaAreas, listaSubmarcas, catalogoContexto] = await Promise.all([getAreas(), getSubMarcas(), getCatalogoContexto()])
        setCatalogo(catalogoContexto)
        setAreas(listaAreas)
        setSubmarcas(listaSubmarcas)
      } catch {
        toast.error('No se pudieron cargar las áreas y sub-marcas')
      }
    }
    fetchAreas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nombre || !formData.email || !formData.password) {
      setFormError('Todos los campos son obligatorios')
      toast.warning('Todos los campos son obligatorios')
      return
    }

    if (formData.rol === 'usuario' && newSubmarcaIds.length === 0) {
      setFormError('Asigna al menos una sub-marca al usuario')
      toast.warning('Asigna al menos una sub-marca al usuario')
      return
    }

    const pideContexto = formData.rol === 'usuario' && catalogo?.disponible
    if (pideContexto && newContexto.organizaciones.length === 0) {
      setFormError('Asigna al menos una organización al usuario')
      toast.warning('Asigna al menos una organización al usuario')
      return
    }

    setIsSubmitting(true)
    setFormError('')

    try {
      const newUser = await createUser({
        ...formData,
        areaIds: formData.rol === 'soporte' ? newAreaIds : undefined,
        submarcaIds: formData.rol === 'usuario' ? newSubmarcaIds : undefined,
        ...(pideContexto
          ? {
              organizacionIds: newContexto.organizaciones,
              sedes: newContexto.sedes,
              todosConcesionarios: newContexto.todosConcesionarios,
              todosImportadores: newContexto.todosImportadores,
            }
          : {}),
      })
      recargarDesdeInicio()
      toast.success(`Usuario "${newUser.nombre}" creado`)
      handleCloseModal()
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message || 'Error al crear el usuario'
        setFormError(msg)
        toast.error(msg)
      } else {
        setFormError('Error al crear el usuario')
        toast.error('Error al crear el usuario')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const replaceUser = (updated: User) => {
    setUsers(users.map(u => (u._id === updated._id ? updated : u)))
  }

  const changeEstado = async (user: User, estado: User['estado']) => {
    try {
      const updated = await updateUser(user._id, { estado })
      replaceUser(updated)
      toast.success(`Usuario "${user.nombre}" ${estado === 'activo' ? 'reactivado' : 'desactivado'}`)
    } catch (err) {
      const apiMsg = axios.isAxiosError(err) ? err.response?.data?.message : undefined
      toast.error(apiMsg || 'No se pudo cambiar el estado del usuario')
    }
  }

  // Desactivar pide confirmación; reactivar es directo
  const handleToggleEstado = (user: User) => {
    if (user.estado === 'activo') {
      setUserToDeactivate(user)
    } else {
      changeEstado(user, 'activo')
    }
  }

  const handleConfirmDeactivate = async () => {
    if (!userToDeactivate) return
    setIsDeactivating(true)
    try {
      await changeEstado(userToDeactivate, 'inactivo')
    } finally {
      setIsDeactivating(false)
      setUserToDeactivate(null)
    }
  }

  const handleSaved = (updated: User) => {
    replaceUser(updated)
    setEditingUser(null)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setFormData({ nombre: '', email: '', password: '', rol: 'soporte' })
    setFormError('')
    setNewAreaIds([])
    setNewSubmarcaIds([])
    setNewContexto(CONTEXTO_INICIAL)
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
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            Usuarios
          </h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Nuevo Usuario
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {error ? (
              <EmptyState icon="⚠️" title="Error al cargar los usuarios" description="Recarga la página para intentarlo de nuevo." />
            ) : users.length === 0 ? (
              <EmptyState
                icon="👥"
                title="No hay usuarios en tu marca"
                description="Crea soportes para atender las áreas y usuarios para que reporten tickets."
                action={{ label: '+ Nuevo Usuario', onClick: () => setIsModalOpen(true) }}
              />
            ) : (
              users.map((user) => (
                <div key={user._id} className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className={user.estado === 'inactivo' ? 'opacity-50' : ''}>
                    <p className="font-medium text-gray-800 dark:text-white">
                      {user.nombre}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {user.email}
                    </p>
                    {user.rol === 'soporte' && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Áreas: {user.areas?.length ? user.areas.map(a => a.nombre).join(', ') : 'sin áreas'}
                      </p>
                    )}
                    {user.rol === 'usuario' && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Sub-marcas: {user.submarcas?.length ? user.submarcas.map(s => s.nombre).join(', ') : 'sin sub-marcas'}
                      </p>
                    )}
                    {user.rol === 'usuario' && catalogo?.disponible && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {resumenContexto(user, catalogo)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${rolColor[user.rol]}`}>
                      {rolLabel[user.rol]}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      user.estado === 'activo'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {cuentaEstadoLabel[user.estado ?? 'activo']}
                    </span>
                    {user.rol !== 'admin' && (
                      <>
                        <button
                          onClick={() => setEditingUser(user)}
                          className="text-xs px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleEstado(user)}
                          className={`text-xs px-3 py-1 rounded transition-colors ${
                            user.estado === 'activo'
                              ? 'border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20'
                              : 'border border-green-300 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20'
                          }`}
                        >
                          {user.estado === 'activo' ? 'Desactivar' : 'Reactivar'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {pagination && <Pagination pagination={pagination} onChange={setPage} disabled={isFetching} />}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Nuevo Usuario"
      >
        <form onSubmit={handleCreateUser}>
          {formError && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded mb-4 text-sm">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nombre completo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mínimo 8 caracteres, con letra y número"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rol
              </label>
              <select
                name="rol"
                value={formData.rol}
                onChange={handleChange}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="soporte">Soporte</option>
                <option value="usuario">Usuario</option>
              </select>
            </div>
            {formData.rol === 'soporte' && (
              <AreaSelector areas={areas} selected={newAreaIds} onChange={setNewAreaIds} />
            )}
            {formData.rol === 'usuario' && (
              <SubMarcaSelector submarcas={submarcas} selected={newSubmarcaIds} onChange={setNewSubmarcaIds} />
            )}
            {formData.rol === 'usuario' && catalogo?.disponible && (
              <ContextoSelector catalogo={catalogo} value={newContexto} onChange={setNewContexto} />
            )}
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
              {isSubmitting ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </Modal>

      <EditUserModal
        user={editingUser}
        rolesPermitidos={['soporte', 'usuario']}
        areas={areas}
        submarcas={submarcas}
        catalogo={catalogo}
        onClose={() => setEditingUser(null)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        isOpen={userToDeactivate !== null}
        title="Desactivar usuario"
        message={
          <>
            <span className="font-medium">{userToDeactivate?.nombre}</span> perderá el acceso de inmediato.
            {userToDeactivate?.rol === 'soporte' && ' Sus tickets abiertos quedarán sin asignar.'}
            {' '}Podrás reactivarlo después.
          </>
        }
        confirmLabel="Desactivar"
        isLoading={isDeactivating}
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setUserToDeactivate(null)}
      />
    </Layout>
  )
}

export default AdminUsersPage