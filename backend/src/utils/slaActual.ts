import { HorarioLaboral, minutosJornada, minutosLaboralesEntre } from './horarioLaboral'

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
}

// El plazo vigente empezó la última vez que la fecha límite se calculó sola: al crear, mover o reabrir.
// (Un ajuste del admin cambia la fecha límite, no el inicio del plazo)
export const inicioDelPlazo = (createdAt: Date, eventos: EventoPlazo[]): Date =>
  eventos
    .filter((e) => e.tipo === 'movido' || (e.tipo === 'estado' && e.a === 'reabierto'))
    .reduce((ultimo, e) => (e.createdAt > ultimo ? e.createdAt : ultimo), createdAt)

export const calcularSlaActual = (
  ticket: { estado: string; fechaLimite?: Date | null; inicioPlazo: Date },
  horario: HorarioLaboral,
  ahora: Date = new Date()
): SlaActual | null => {
  if (ticket.estado === 'cerrado' || !ticket.fechaLimite) return null
  const limite = ticket.fechaLimite

  if (ahora.getTime() >= limite.getTime()) {
    return {
      porcentaje: 100,
      restanteMinutos: 0,
      vencidoHaceMinutos: Math.round((ahora.getTime() - limite.getTime()) / MINUTO_MS),
      minutosJornada: minutosJornada(horario),
      nivel: 'vencido'
    }
  }

  const plazo = minutosLaboralesEntre(ticket.inicioPlazo, limite, horario)
  const restante = minutosLaboralesEntre(ahora, limite, horario)
  const porcentaje = plazo > 0 ? Math.min(100, Math.max(0, Math.round((1 - restante / plazo) * 100))) : 100
  const nivel: NivelSla = porcentaje >= UMBRAL_PRONTO ? 'pronto' : porcentaje >= UMBRAL_ATENCION ? 'atencion' : 'ok'
  return { porcentaje, restanteMinutos: restante, vencidoHaceMinutos: 0, minutosJornada: minutosJornada(horario), nivel }
}
