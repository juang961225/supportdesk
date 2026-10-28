import type { SlaActual } from '../types'

// Textos y colores de la barra de SLA (los niveles los decide el backend: 50% atención, 75% vence pronto)

const horasYMinutos = (minutos: number): string => {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

const dias = (n: number, adjetivo = ''): string => `${n} ${n === 1 ? 'día' : 'días'}${adjetivo ? ` ${adjetivo}${n === 1 ? '' : 'es'}` : ''}`

// Tiempo laboral en días de jornada + lo que sobra del último día: con jornada de 8 h, 21 h → "2 días y 5 h"
// (así nadie lee "21 h" como "mañana"). Menos de una jornada queda en horas y minutos
export const formatTiempoLaboral = (minutos: number, minutosJornada: number): string => {
  if (minutosJornada <= 0 || minutos < minutosJornada) return `${horasYMinutos(minutos)} laborales`
  const completos = Math.floor(minutos / minutosJornada)
  const resto = minutos % minutosJornada
  return resto ? `${dias(completos)} y ${horasYMinutos(resto)} laborales` : dias(completos, 'laboral')
}

// Tiempo real (de calendario) desde que venció: 150 → "2 h 30 min", 3000 → "2 días y 2 h"
const formatTiempoReal = (minutos: number): string => {
  const DIA = 24 * 60
  if (minutos < DIA) return horasYMinutos(minutos)
  const completos = Math.floor(minutos / DIA)
  const horas = Math.floor((minutos % DIA) / 60)
  return horas ? `${dias(completos)} y ${horas} h` : dias(completos)
}

export const textoSla = (sla: SlaActual): string =>
  sla.nivel === 'vencido'
    ? `Vencido hace ${formatTiempoReal(sla.vencidoHaceMinutos)}`
    : `Quedan ${formatTiempoLaboral(sla.restanteMinutos, sla.minutosJornada)}`

export const etiquetaNivelSla: Record<SlaActual['nivel'], string> = {
  ok: 'A tiempo',
  atencion: 'Atención',
  pronto: 'Vence pronto',
  vencido: 'Vencido',
}

// Relleno de la barra por urgencia; el texto va siempre en gris (nunca en el color de la barra)
export const colorBarraSla: Record<SlaActual['nivel'], string> = {
  ok: 'bg-green-500',
  atencion: 'bg-amber-400',
  pronto: 'bg-orange-500',
  vencido: 'bg-red-600',
}
