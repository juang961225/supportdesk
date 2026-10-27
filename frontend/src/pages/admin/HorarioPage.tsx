import { useState, useEffect } from 'react'
import axios from 'axios'
import Layout from '../../components/Layout'
import { PageSkeleton } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import { getHorario, updateHorario } from '../../services/horarioService'
import { useToast } from '../../hooks/useToast'
import type { HorarioLaboral } from '../../types'

const inputClass =
  'border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'

// Lunes primero; el valor es el del backend (0 = domingo)
const DIAS = [
  { valor: 1, label: 'Lun' },
  { valor: 2, label: 'Mar' },
  { valor: 3, label: 'Mié' },
  { valor: 4, label: 'Jue' },
  { valor: 5, label: 'Vie' },
  { valor: 6, label: 'Sáb' },
  { valor: 0, label: 'Dom' },
]

const aMinutos = (hora: string): number => {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

const formatHoras = (minutos: number): string => {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

// "2026-12-25" → "vie, 25 dic 2026" (sin desfase de zona: se arma en hora local)
const formatFestivo = (fecha: string): string => {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

// Admin: horario laboral de la marca. Define las fechas límite (en tiempo laboral) y, en F2-4b, el SLA
function HorarioPage() {
  const { toast } = useToast()
  const [horario, setHorario] = useState<HorarioLaboral | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [nuevoFestivo, setNuevoFestivo] = useState('')

  useEffect(() => {
    const fetchHorario = async () => {
      try {
        setHorario(await getHorario())
      } catch {
        toast.error('No se pudo cargar el horario')
      } finally {
        setIsLoading(false)
      }
    }
    fetchHorario()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isLoading) {
    return (
      <Layout>
        <PageSkeleton variant="formulario" />
      </Layout>
    )
  }

  if (!horario) {
    return (
      <Layout>
        <EmptyState icon="⚠️" title="Error al cargar el horario" description="Recarga la página para intentarlo de nuevo." />
      </Layout>
    )
  }

  const jornada = aMinutos(horario.fin) - aMinutos(horario.inicio)
  const jornadaValida = jornada > 0

  const toggleDia = (dia: number) => {
    const dias = horario.dias.includes(dia) ? horario.dias.filter((d) => d !== dia) : [...horario.dias, dia]
    setHorario({ ...horario, dias })
  }

  const agregarFestivo = () => {
    if (!nuevoFestivo) return
    if (horario.festivos.includes(nuevoFestivo)) {
      toast.warning('Esa fecha ya está en la lista')
      return
    }
    setHorario({ ...horario, festivos: [...horario.festivos, nuevoFestivo].sort() })
    setNuevoFestivo('')
  }

  const quitarFestivo = (fecha: string) =>
    setHorario({ ...horario, festivos: horario.festivos.filter((f) => f !== fecha) })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (horario.dias.length === 0) {
      setFormError('Elige al menos un día laborable')
      return
    }
    if (!jornadaValida) {
      setFormError('La hora de inicio debe ser anterior a la de fin')
      return
    }

    setIsSaving(true)
    setFormError('')
    try {
      setHorario(await updateHorario(horario))
      toast.success('Horario guardado')
    } catch (err) {
      const msg = (axios.isAxiosError(err) ? err.response?.data?.message : undefined) || 'Error al guardar el horario'
      setFormError(msg)
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-3xl">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Horario laboral</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Las fechas límite cuentan solo este horario (hora Colombia). Los cambios aplican a las fechas que se
          calculen desde ahora: tickets nuevos, movidos de área o reabiertos. Las actuales no cambian.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded text-sm">{formError}</div>
          )}

          {/* Días y horas */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Días laborables</h3>
            <div className="flex flex-wrap gap-2 mb-6">
              {DIAS.map((dia) => {
                const activo = horario.dias.includes(dia.valor)
                return (
                  <button
                    key={dia.valor}
                    type="button"
                    onClick={() => toggleDia(dia.valor)}
                    aria-pressed={activo}
                    className={`w-14 py-2 text-sm rounded-lg transition-colors ${
                      activo
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {dia.label}
                  </button>
                )
              })}
            </div>

            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Jornada</h3>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="time"
                aria-label="Hora de inicio"
                value={horario.inicio}
                onChange={(e) => setHorario({ ...horario, inicio: e.target.value })}
                className={inputClass}
              />
              <span className="text-gray-500 dark:text-gray-400">a</span>
              <input
                type="time"
                aria-label="Hora de fin"
                value={horario.fin}
                onChange={(e) => setHorario({ ...horario, fin: e.target.value })}
                className={inputClass}
              />
              {jornadaValida && (
                <span className="text-sm text-gray-500 dark:text-gray-400">Jornada de {formatHoras(jornada)}</span>
              )}
            </div>

            {/* Cómo quedan los plazos por prioridad (1 día = 1 jornada) */}
            {jornadaValida && (
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                {[
                  { label: 'Crítica', plazo: '4 h laborales' },
                  { label: 'Alta', plazo: `1 día (${formatHoras(jornada)})` },
                  { label: 'Media', plazo: '3 días laborales' },
                  { label: 'Baja', plazo: '5 días laborales' },
                ].map((p) => (
                  <div key={p.label} className="rounded bg-gray-50 dark:bg-gray-700/50 p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{p.label}</p>
                    <p className="font-medium text-gray-800 dark:text-white">{p.plazo}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Festivos */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Festivos y días no laborables</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Esos días no cuentan para las fechas límite.</p>
            <div className="flex flex-wrap gap-2 mb-4">
              <input
                type="date"
                aria-label="Nuevo festivo"
                value={nuevoFestivo}
                onChange={(e) => setNuevoFestivo(e.target.value)}
                className={inputClass}
              />
              <button
                type="button"
                onClick={agregarFestivo}
                disabled={!nuevoFestivo}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                + Agregar
              </button>
            </div>
            {horario.festivos.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No hay festivos agregados.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {horario.festivos.map((fecha) => (
                  <li
                    key={fecha}
                    className="flex items-center gap-2 text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    {formatFestivo(fecha)}
                    <button
                      type="button"
                      onClick={() => quitarFestivo(fecha)}
                      aria-label={`Quitar ${fecha}`}
                      className="text-red-600 dark:text-red-400 hover:underline"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Guardando...' : 'Guardar horario'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}

export default HorarioPage
