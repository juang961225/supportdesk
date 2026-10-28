import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import ChartCard from './ChartCard'
import BarrasHorizontales from './BarrasHorizontales'
import type { DatoBarra } from './BarrasHorizontales'
import LineaTiempo from './LineaTiempo'
import { Skeleton } from '../Skeleton'
import { getTendencias } from '../../services/dashboardService'
import type { PeriodoTendencias, Tendencias } from '../../services/dashboardService'
import { useToast } from '../../hooks/useToast'
import { estadoLabel } from '../../utils/ticketLabels'
import { formatTiempoLaboral } from '../../utils/sla'

const PERIODOS: PeriodoTendencias[] = [7, 30, 90]
const PERIODO_POR_DEFECTO: PeriodoTendencias = 30
const MAX_BARRAS = 10 // el resto se agrupa en "Otras"

const formatoNumero = (valor: number): string => valor.toLocaleString('es-CO')

// "2026-10-21" → "21 oct" (se arma en hora local para no correr el día)
const formatFechaCorta = (fecha: string): string => {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

// Las primeras MAX_BARRAS tal cual; el resto sumado en una barra "Otras (n)"
const conOtras = (datos: DatoBarra[]): DatoBarra[] => {
  if (datos.length <= MAX_BARRAS) return datos
  const resto = datos.slice(MAX_BARRAS - 1)
  return [
    ...datos.slice(0, MAX_BARRAS - 1),
    { etiqueta: `Otras (${resto.length})`, valor: resto.reduce((suma, d) => suma + d.valor, 0) },
  ]
}

const filasDe = (datos: DatoBarra[], formato: (valor: number) => string = formatoNumero) =>
  datos.map((d) => ({ etiqueta: d.etiqueta, valor: formato(d.valor) }))

// Sección "Tendencias" del dashboard del admin: selector de periodo (en la URL) y gráficas de su marca
function TendenciasAdmin() {
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const pedido = Number(searchParams.get('periodo'))
  const dias = PERIODOS.find((p) => p === pedido) ?? PERIODO_POR_DEFECTO

  const [datos, setDatos] = useState<Tendencias | null>(null)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelado = false
    const fetchTendencias = async () => {
      setIsFetching(true)
      try {
        const data = await getTendencias(dias)
        if (cancelado) return
        setDatos(data)
        setError(false)
      } catch {
        if (!cancelado) {
          setError(true)
          toast.error('No se pudieron cargar las gráficas')
        }
      } finally {
        if (!cancelado) setIsFetching(false)
      }
    }
    fetchTendencias()
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dias])

  const cambiarPeriodo = (periodo: PeriodoTendencias) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      if (periodo === PERIODO_POR_DEFECTO) params.delete('periodo')
      else params.set('periodo', String(periodo))
      return params
    }, { replace: true })
  }

  const porDia = datos?.unidad !== 'semana'
  const creados = (datos?.creados ?? []).map((c) => ({ etiqueta: formatFechaCorta(c.fecha), valor: c.total }))
  const porEstado = (datos?.porEstado ?? []).map((e) => ({ etiqueta: estadoLabel[e.estado], valor: e.total }))
  const porArea = conOtras((datos?.porArea ?? []).map((a) => ({ etiqueta: a.nombre, valor: a.total })))
  const porCategoria = conOtras((datos?.porCategoria ?? []).map((c) => ({ etiqueta: c.nombre, valor: c.total })))
  const sla = datos?.sla ?? []
  const tiempoPromedio = [...sla]
    .sort((a, b) => b.promedioMinutos - a.promedioMinutos)
    .map((s) => ({ etiqueta: s.area, valor: s.promedioMinutos }))
  const vencidos = [...sla].sort((a, b) => b.porcentajeVencidos - a.porcentajeVencidos)
  const sinTickets = (datos?.total ?? 0) === 0
  // Tiempo promedio en días de la jornada de la marca ("2 días y 5 h")
  const formatoTiempo = (minutos: number) => formatTiempoLaboral(minutos, datos?.minutosJornada ?? 0, false)

  return (
    <section className="mt-8" aria-labelledby="titulo-tendencias">
      {/* Filtro de periodo: una fila encima de todas las gráficas */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 id="titulo-tendencias" className="text-lg font-semibold text-gray-800 dark:text-white">Tendencias</h3>
        <div className="flex rounded-lg bg-white dark:bg-gray-800 shadow-sm p-1" role="group" aria-label="Periodo">
          {PERIODOS.map((periodo) => (
            <button
              key={periodo}
              type="button"
              onClick={() => cambiarPeriodo(periodo)}
              aria-pressed={dias === periodo}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                dias === periodo
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {periodo} días
            </button>
          ))}
        </div>
      </div>

      {!datos ? (
        error ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No se pudieron cargar las gráficas. Recarga la página para intentarlo de nuevo.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-64 lg:col-span-2" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        )
      ) : (
        // Al cambiar de periodo se conserva la gráfica anterior atenuada mientras carga
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          <ChartCard
            className="lg:col-span-2"
            titulo={porDia ? 'Tickets creados por día' : 'Tickets creados por semana'}
            subtitulo={`${formatoNumero(datos.total)} en los últimos ${datos.dias} días`}
            vacio={sinTickets}
            tabla={{
              columnaEtiqueta: porDia ? 'Día' : 'Semana del',
              columnaValor: 'Creados',
              filas: filasDe(creados),
            }}
          >
            <LineaTiempo datos={creados} formatoEtiquetaTooltip={porDia ? undefined : (e) => `Semana del ${e}`} />
          </ChartCard>

          <ChartCard
            titulo="Por estado"
            subtitulo="Estado actual de los tickets creados en el periodo"
            vacio={sinTickets}
            tabla={{ columnaEtiqueta: 'Estado', columnaValor: 'Tickets', filas: filasDe(porEstado) }}
          >
            <BarrasHorizontales datos={porEstado} />
          </ChartCard>

          <ChartCard
            titulo="Por área"
            subtitulo="Área actual de los tickets creados en el periodo"
            vacio={sinTickets}
            tabla={{ columnaEtiqueta: 'Área', columnaValor: 'Tickets', filas: filasDe(porArea) }}
          >
            <BarrasHorizontales datos={porArea} />
          </ChartCard>

          <ChartCard
            titulo="Por categoría"
            subtitulo="Tickets creados en el periodo"
            vacio={sinTickets}
            tabla={{ columnaEtiqueta: 'Categoría', columnaValor: 'Tickets', filas: filasDe(porCategoria) }}
          >
            <BarrasHorizontales datos={porCategoria} />
          </ChartCard>

          <ChartCard
            titulo="Tiempo promedio por área"
            subtitulo="Tramos terminados (movidos o cerrados) en el periodo · horario laboral"
            vacio={sla.length === 0}
            tabla={{ columnaEtiqueta: 'Área', columnaValor: 'Promedio', filas: filasDe(tiempoPromedio, formatoTiempo) }}
          >
            <BarrasHorizontales datos={tiempoPromedio} formatoValor={formatoTiempo} />
          </ChartCard>

          <ChartCard
            className="lg:col-span-2"
            titulo="Tramos vencidos por área"
            subtitulo="% de tramos terminados en el periodo que pasaron su fecha límite"
            vacio={sla.length === 0}
            tabla={{
              columnaEtiqueta: 'Área',
              columnaValor: 'Vencidos',
              filas: vencidos.map((s) => ({ etiqueta: s.area, valor: `${s.porcentajeVencidos}% (${s.vencidos} de ${s.tramos})` })),
            }}
          >
            <BarrasHorizontales
              datos={vencidos.map((s) => ({ etiqueta: s.area, valor: s.porcentajeVencidos }))}
              formatoValor={(v) => `${v}%`}
              maximo={100}
            />
          </ChartCard>
        </div>
      )}
    </section>
  )
}

export default TendenciasAdmin
