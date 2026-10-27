import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import ChartTooltip from './ChartTooltip'

export interface PuntoTiempo {
  etiqueta: string // ya formateada para el eje (ej. "21 oct")
  valor: number
}

interface LineaTiempoProps {
  datos: PuntoTiempo[]
  formatoEtiquetaTooltip?: (etiqueta: string) => string
}

const formatoNumero = (valor: number): string => valor.toLocaleString('es-CO')

// Serie única en el tiempo: línea de 2px con lavado del 10% y crosshair con tooltip
function LineaTiempo({ datos, formatoEtiquetaTooltip }: LineaTiempoProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={datos} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-rejilla)" strokeWidth={1} />
        <XAxis
          dataKey="etiqueta"
          tickLine={false}
          axisLine={{ stroke: 'var(--chart-eje)' }}
          tick={{ fill: 'var(--chart-tinta-suave)', fontSize: 12 }}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          allowDecimals={false}
          width={32}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--chart-tinta-suave)', fontSize: 12 }}
        />
        <Tooltip
          cursor={{ stroke: 'var(--chart-eje)', strokeWidth: 1 }}
          content={({ active, payload, label }) => (
            <ChartTooltip
              active={active}
              payload={payload}
              label={label}
              formatoValor={formatoNumero}
              formatoEtiqueta={formatoEtiquetaTooltip}
            />
          )}
        />
        <Area
          type="linear"
          dataKey="valor"
          stroke="var(--chart-serie)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="var(--chart-serie)"
          fillOpacity={0.1}
          dot={false}
          activeDot={{ r: 4, fill: 'var(--chart-serie)', stroke: 'var(--chart-superficie)', strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default LineaTiempo
