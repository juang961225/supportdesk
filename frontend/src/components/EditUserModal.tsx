import { useState, useEffect } from 'react'
import axios from 'axios'
import Modal from './Modal'
import { updateUser } from '../services/userService'
import type { UpdateUserData } from '../services/userService'
import { useToast } from '../hooks/useToast'
import type { User, Brand } from '../types'

interface EditUserModalProps {
  user: User | null
  rolesPermitidos: User['rol'][]
  brands?: Brand[] // si viene, se muestra el selector de marca (solo superadmin)
  onClose: () => void
  onSaved: (user: User) => void
}

const rolLabel: Record<User['rol'], string> = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  soporte: 'Soporte',
  usuario: 'Usuario',
}

const inputClass =
  'w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'

const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

function EditUserModal({ user, rolesPermitidos, brands, onClose, onSaved }: EditUserModalProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({ nombre: '', email: '', password: '', rol: '', marcaId: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Cada vez que se abre con un usuario, el formulario arranca con sus datos
  useEffect(() => {
    if (!user) return
    setFormData({
      nombre: user.nombre,
      email: user.email,
      password: '',
      rol: user.rol,
      marcaId: user.marca?._id ?? '',
    })
    setFormError('')
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // Solo se envían los campos que cambiaron
  const buildChanges = (original: User): UpdateUserData => {
    const changes: UpdateUserData = {}
    if (formData.nombre.trim() !== original.nombre) changes.nombre = formData.nombre.trim()
    if (formData.email.trim() !== original.email) changes.email = formData.email.trim()
    if (formData.password) changes.password = formData.password
    if (formData.rol !== original.rol) changes.rol = formData.rol as User['rol']
    if (brands && formData.marcaId && formData.marcaId !== original.marca?._id) changes.marcaId = formData.marcaId
    return changes
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!formData.nombre.trim() || !formData.email.trim()) {
      setFormError('Nombre y email son obligatorios')
      toast.warning('Nombre y email son obligatorios')
      return
    }

    const changes = buildChanges(user)
    if (Object.keys(changes).length === 0) {
      onClose()
      return
    }

    setIsSubmitting(true)
    setFormError('')
    try {
      const updated = await updateUser(user._id, changes)
      toast.success(`Usuario "${updated.nombre}" actualizado`)
      onSaved(updated)
    } catch (err) {
      const apiMsg = axios.isAxiosError(err) ? err.response?.data?.message : undefined
      const msg = apiMsg || 'Error al actualizar el usuario'
      setFormError(msg)
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={user !== null} onClose={onClose} title="Editar usuario">
      <form onSubmit={handleSubmit}>
        {formError && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded mb-4 text-sm">
            {formError}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className={labelClass}>Nombre</label>
            <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Nueva contraseña</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={inputClass}
              placeholder="Dejar vacío para no cambiarla"
            />
          </div>

          <div>
            <label className={labelClass}>Rol</label>
            <select name="rol" value={formData.rol} onChange={handleChange} className={inputClass}>
              {rolesPermitidos.map((rol) => (
                <option key={rol} value={rol}>{rolLabel[rol]}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Solo se puede cambiar si el usuario no tiene tickets.
            </p>
          </div>

          {brands && (
            <div>
              <label className={labelClass}>Marca</label>
              <select name="marcaId" value={formData.marcaId} onChange={handleChange} className={inputClass}>
                <option value="">Selecciona una marca</option>
                {brands.map((brand) => (
                  <option key={brand._id} value={brand._id}>{brand.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* B2: aquí se agrega el selector de áreas para soportes */}
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default EditUserModal
