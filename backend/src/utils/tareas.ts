import { HorarioLaboral, minutosJornada, minutosLaboralesEntre } from './horarioLaboral'
import { SlaActual } from './slaActual'

// Reglas de las tareas automáticas (funciones puras). Lo que escribe en la base está en services/tareasProgramadas.ts

export const DIAS_RECORDATORIO = 3 // sin respuesta del usuario: recordatorio
export const DIAS_CIERRE_SIN_RESPUESTA = 5 // sin respuesta del usuario: se cierra
export const DIAS_CIERRE_RESUELTO = 3 // resuelto sin confirmar: se cierra

// Vencido hace más de esto al detectarlo: se marca sin avisar. Evita una avalancha de correos
// la primera vez que corre, o después de una caída larga del servidor
export const MAX_ATRASO_AVISO_MS = 24 * 60 * 60 * 1000

export type ClaveAviso = 'ticketPronto' | 'ticketVencido' | 'areaPronto' | 'areaVencido'
export type AvisosPlazo = Partial<Record<ClaveAviso | 'recordatorio', Date>>

export interface Aviso {
  alcance: 'ticket' | 'area'
  nivel: 'pronto' | 'vencido'
}

interface TicketParaAviso {
  fechaLimite?: Date | null
  fechaLimiteArea?: Date | null
  avisosPlazo?: AvisosPlazo | null
}

const mismaFecha = (a: Date | null | undefined, b: Date): boolean => a?.getTime() === b.getTime()

// Qué marcar y, si corresponde, qué aviso enviar. Cada marca guarda la fecha a la que se refiere:
// si la fecha límite cambia (pausa, ampliación, otra área), el aviso vuelve a quedar disponible
export const avisoDePlazo = (
  ticket: TicketParaAviso,
  sla: SlaActual | null,
  slaArea: SlaActual | null,
  ahora: Date = new Date()
): { marcas: Partial<Record<ClaveAviso, Date>>; enviar: Aviso | null } => {
  const marcas: Partial<Record<ClaveAviso, Date>> = {}
  const pendientes: (Aviso & { limite: Date })[] = []
  const avisos = ticket.avisosPlazo ?? {}

  const revisar = (alcance: Aviso['alcance'], slaActual: SlaActual | null, limite: Date | null | undefined) => {
    if (!slaActual || !limite) return
    const nivel = slaActual.nivel === 'vencido' ? 'vencido' : slaActual.nivel === 'pronto' ? 'pronto' : null
    if (!nivel) return
    const claveVencido: ClaveAviso = alcance === 'ticket' ? 'ticketVencido' : 'areaVencido'
    const clavePronto: ClaveAviso = alcance === 'ticket' ? 'ticketPronto' : 'areaPronto'
    const clave = nivel === 'vencido' ? claveVencido : clavePronto
    if (mismaFecha(avisos[clave], limite)) return
    // Si ya venció, el aviso previo no tiene sentido: se da por enviado
    if (nivel === 'vencido') marcas[clavePronto] = limite
    // Vencido → vencido ya notificado por otro camino no aplica; el aviso previo tampoco se repite
    if (nivel === 'pronto' && mismaFecha(avisos[claveVencido], limite)) return
    marcas[clave] = limite
    pendientes.push({ alcance, nivel, limite })
  }

  const limiteArea = ticket.fechaLimiteArea ?? ticket.fechaLimite
  revisar('ticket', sla, ticket.fechaLimite)
  // Sin plazo propio del área (o con la misma fecha) es un solo plazo: un solo aviso
  if (limiteArea && !(ticket.fechaLimite && mismaFecha(ticket.fechaLimite, limiteArea))) revisar('area', slaArea, limiteArea)

  const vigentes = pendientes.filter((p) => p.nivel !== 'vencido' || ahora.getTime() - p.limite.getTime() <= MAX_ATRASO_AVISO_MS)
  // Si coinciden en la misma revisión sale un solo correo, el más grave
  const prioridad = (a: Aviso): number => (a.nivel === 'vencido' ? 0 : 2) + (a.alcance === 'ticket' ? 0 : 1)
  const elegido = [...vigentes].sort((a, b) => prioridad(a) - prioridad(b))[0]
  return { marcas, enviar: elegido ? { alcance: elegido.alcance, nivel: elegido.nivel } : null }
}

export type AccionPausa = 'recordar' | 'cerrar_sin_respuesta' | 'cerrar_sin_confirmar' | null

// Qué hacer con un ticket en pausa, según los días laborales que lleva así
export const accionDePausa = (
  ticket: { estado: string; pausadoDesde?: Date | null; avisosPlazo?: AvisosPlazo | null },
  horario: HorarioLaboral,
  ahora: Date = new Date()
): AccionPausa => {
  if (!ticket.pausadoDesde) return null
  const jornada = minutosJornada(horario)
  if (jornada <= 0) return null
  const dias = minutosLaboralesEntre(ticket.pausadoDesde, ahora, horario) / jornada

  if (ticket.estado === 'resuelto') return dias >= DIAS_CIERRE_RESUELTO ? 'cerrar_sin_confirmar' : null
  if (ticket.estado !== 'esperando_usuario') return null
  if (dias >= DIAS_CIERRE_SIN_RESPUESTA) return 'cerrar_sin_respuesta'
  if (dias >= DIAS_RECORDATORIO && !mismaFecha(ticket.avisosPlazo?.recordatorio, ticket.pausadoDesde)) return 'recordar'
  return null
}

// Prendidas en producción, o si se piden. En desarrollo no: enviarían correos reales sin que nadie haga nada
export const tareasActivas = (env: Record<string, string | undefined>): boolean => {
  if (env.TAREAS_PROGRAMADAS === 'on') return true
  if (env.TAREAS_PROGRAMADAS === 'off') return false
  return env.NODE_ENV === 'production'
}
