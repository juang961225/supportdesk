import { BarChart, Bar, XAxis, YAxis, Tooltip, LabelList, ResponsiveContainer } from 'recharts'
import ChartTooltip from './ChartTooltip'

export interface DatoBarra {
  etiqueta: string
  valor: number
}

interface BarrasHorizontalesProps {
  datos: DatoBarra[]
  formatoValor?: (valor: number) => string
  maximo?: number // escala fija (ej. 100 para porcentajes); si no, el mayor valor
}

const ALTO_FILA = 32
const GROSOR_BARRA = 16 // fino: nunca llena la fila
const ANCHO_LETRA = 7

const formatoNumero = (valor: number): string => valor.toLocaleString('es-CO')

// Barras horizontales de una sola serie (un tono), con el valor en la punta de cada barra
function BarrasHorizontales({ datos, formatoValor = formatoNumero, maximo }: BarrasHorizontalesProps) {
  const anchoEtiquetas = Math.min(Math.max(...datos.map((d) => d.etiqueta.length), 4) * ANCHO_LETRA + 8, 150)
  const anchoValores = Math.max(...datos.map((d) => formatoValor(d.valor).length)) * ANCHO_LETRA + 12

  return (
    <ResponsiveContainer width="100%" height={datos.length * ALTO_FILA + 8}>
      <BarChart data={datos} layout="vertical" margin={{ top: 4, right: anchoValores, bottom: 4, left: 0 }}>
        <XAxis type="number" hide domain={[0, maximo ?? 'dataMax']} />
        <YAxis
          type="category"
          dataKey="etiqueta"
          width={anchoEtiquetas}
          tickLine={false}
          axisLine={{ stroke: 'var(--chart-eje)' }}
          tick={{ fill: 'var(--chart-tinta-suave)', fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: 'var(--chart-rejilla)', opacity: 0.5 }}
          content={({ active, payload, label }) => (
            <ChartTooltip active={active} payload={payload} label={label} formatoValor={formatoValor} />
          )}
        />
        <Bar dataKey="valor" fill="var(--chart-serie)" barSize={GROSOR_BARRA} radius={[0, 4, 4, 0]} isAnimationActive={false}>
          <LabelList
            dataKey="valor"
            position="right"
            formatter={(valor) => formatoValor(Number(valor))}
            style={{ fill: 'var(--chart-tinta)', fontSize: 12 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export default BarrasHorizontales
