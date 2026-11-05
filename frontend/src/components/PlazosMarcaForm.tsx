import { useEffect, useState } from 'react'
import axios from 'axios'
import { getPlazos, updatePlazos } from '../services/horarioService'
import { useToast } from '../hooks/useToast'
import { aFormulario, deFormulario, PRIORIDADES } from '../utils/plazos'
import type { FormularioPlazos } from '../utils/plazos'
import type { Plazos } from '../types'
import PlazosEditor from './PlazosEditor'
import { SkeletonLines } from './Skeleton'

// Plazos base de la marca. Cada área puede ajustarlos desde la página de Áreas
function PlazosMarcaForm() {
  const { toast } = useToast()
  const [formulario, setFormulario] = useState<FormularioPlazos | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    getPlazos()
      .then((plazos) => setFormulario(aFormulario(plazos)))
      .catch(() => toast.error('No se pudieron cargar los plazos'))
  }, [toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formulario) return
    const plazos = deFormulario(formulario)
    if (!plazos || PRIORIDADES.some((p) => !plazos[p])) {
      setFormError('Escribe un número entero mayor que cero en cada prioridad')
      return
    }

    setIsSaving(true)
    setFormError('')
    try {
      setFormulario(aFormulario(await updatePlazos(plazos as Plazos)))
      toast.success('Plazos guardados')
    } catch (err) {
      const msg = (axios.isAxiosError(err) ? err.response?.data?.message : undefined) || 'Error al guardar los plazos'
      setFormError(msg)
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6 mt-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Plazos por prioridad</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Valen para toda la marca; en Áreas puedes ajustar los de un área. Un día es una jornada del horario de arriba.
        Aplican a tickets nuevos, movidos de área o reabiertos; las fechas actuales no cambian.
      </p>
      {formError && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded text-sm mb-4">{formError}</div>
      )}
      {formulario ? <PlazosEditor value={formulario} onChange={setFormulario} /> : <SkeletonLines count={2} />}
      <div className="flex justify-end mt-4">
        <button
          type="submit"
          disabled={isSaving || !formulario}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isSaving ? 'Guardando...' : 'Guardar plazos'}
        </button>
      </div>
    </form>
  )
}

export default PlazosMarcaForm
