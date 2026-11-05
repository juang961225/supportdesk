import { HorarioLaboral } from './horarioLaboral'
import { relojDe } from './fechaLimite'
import { ESTADOS_SIN_RELOJ, EstadoTicket } from './ticketStatus'

// Estado del SLA en este momento: cuánto del plazo vigente se consumió (en tiempo laboral) y qué tan urgente es

export type NivelSla = 'ok' | 'atencion' | 'pronto' | 'vencido'

export interface SlaActual {
  porcentaje: number          // 0–100 del plazo consumido
  restanteMinutos: number     // laborales hasta la fecha límite (0 si venció)
  vencidoHaceMinutos: number  // reales desde que venció (0 si no venció)
  minutosJornada: number      // de la marca: para mostrar lo restante en días laborales
  nivel: NivelSla
}

export const UMBRAL_ATENCION = 50 // % consumido: ámbar
export const UMBRAL_PRONTO = 75   // % consumido: "Vence pronto"

const MINUTO_MS = 60 * 1000

interface EventoPlazo {
  tipo: string
  a?: string
  createdAt: Date
  fechaLimiteAreaAnterior?: Date
}

const ultimoInicio = (createdAt: Date, eventos: EventoPlazo[]): Date =>
  eventos.reduce((ultimo, e) => (e.createdAt > ultimo ? e.createdAt : ultimo), createdAt)

// El plazo del ticket empieza al crearlo, o al corregir la prioridad. Mover no lo reinicia
// (los tickets movidos antes de separar los plazos sí recibieron una fecha nueva: no traen fechaLimiteAreaAnterior).
// Un ajuste del admin cambia la fecha límite, no el inicio; reabrir continúa el plazo que venía.
export const inicioDelPlazo = (createdAt: Date, eventos: EventoPlazo[]): Date =>
  ultimoInicio(createdAt, eventos.filter((e) => e.tipo === 'prioridad' || (e.tipo === 'movido' && !e.fechaLimiteAreaAnterior)))

// El plazo del área empieza cada vez que el ticket entra a un área, o al corregir la prioridad
export const inicioDelPlazoArea = (createdAt: Date, eventos: EventoPlazo[]): Date =>
  ultimoInicio(createdAt, eventos.filter((e) => e.tipo === 'prioridad' || e.tipo === 'movido'))

export const calcularSlaActual = (
  ticket: { estado: string; prioridad?: string; fechaLimite?: Date | null; inicioPlazo: Date },
  horario: HorarioLaboral,
  ahora: Date = new Date(),
  pausas: { desde: number; hasta: number }[] = []
): SlaActual | null => {
  if (ESTADOS_SIN_RELOJ.includes(ticket.estado as EstadoTicket) || !ticket.fechaLimite) return null
  const limite = ticket.fechaLimite

  if (ahora.getTime() >= limite.getTime()) {
    return {
      porcentaje: 100,
      restanteMinutos: 0,
      vencidoHaceMinutos: Math.round((ahora.getTime() - limite.getTime()) / MINUTO_MS),
      minutosJornada: relojDe(ticket.prioridad, horario).minutosJornada,
      nivel: 'vencido'
    }
  }

  const reloj = relojDe(ticket.prioridad, horario)
  // Lo que estuvo en pausa alargó la fecha, pero no es parte del plazo
  const minutosEnPausa = pausas.reduce((suma, p) => {
    const desde = Math.max(p.desde, ticket.inicioPlazo.getTime())
    const hasta = Math.min(p.hasta, limite.getTime())
    return hasta > desde ? suma + reloj.minutosEntre(new Date(desde), new Date(hasta)) : suma
  }, 0)
  const plazo = reloj.minutosEntre(ticket.inicioPlazo, limite) - minutosEnPausa
  const restante = reloj.minutosEntre(ahora, limite)
  const porcentaje = plazo > 0 ? Math.min(100, Math.max(0, Math.round((1 - restante / plazo) * 100))) : 100
  const nivel: NivelSla = porcentaje >= UMBRAL_PRONTO ? 'pronto' : porcentaje >= UMBRAL_ATENCION ? 'atencion' : 'ok'
  return { porcentaje, restanteMinutos: restante, vencidoHaceMinutos: 0, minutosJornada: reloj.minutosJornada, nivel }
}
