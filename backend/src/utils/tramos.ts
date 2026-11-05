import { HorarioLaboral } from './horarioLaboral'
import { relojDe } from './fechaLimite'
import { ESTADOS_EN_PAUSA, ESTADOS_SIN_RELOJ, EstadoTicket } from './ticketStatus'

// Tramos por área de un ticket, calculados desde el historial (funciones puras).
// - Un tramo empieza al crear el ticket o al moverlo de área, y termina al moverlo otra vez o al cerrarlo.
// - El tiempo se mide en horario laboral y no cuenta en pausa: esperando al usuario, resuelto o cerrado.
// - Vencido: en algún momento abierto dentro del tramo se pasó la fecha límite vigente en ese momento.
// - Vencido sin ajuste: lo mismo, sin contar lo que el admin amplió a mano. Mover, reabrir o corregir la
//   prioridad sí calculan un plazo legítimo; ampliar no debe hacer que un tramo cuente como "a tiempo" sin dejar rastro.

export interface EventoParaTramos {
  tipo: string
  createdAt: Date
  de?: string
  a?: string
  deNombre?: string
  aNombre?: string
  fechaLimiteAnterior?: Date
  fechaLimiteAreaAnterior?: Date
}

export interface TicketParaTramos {
  createdAt: Date
  estado: string
  fechaCierre?: Date
  fechaLimite?: Date
  fechaLimiteArea?: Date
  prioridad?: string
  areaId?: string
  areaNombre?: string
}

export interface Tramo {
  areaId: string | null
  area: string
  entrada: Date
  salida: Date | null      // null = en curso
  minutosLaborales: number
  fechaLimite: Date | null // la vigente al final del tramo
  vencido: boolean | null  // null = sin fecha límite (tickets antiguos)
  vencidoSinAjuste: boolean | null // sin contar lo que el admin amplió a mano
}

export interface Intervalo {
  desde: number
  hasta: number
}

// Lo que queda de `base` al quitarle los intervalos `quitar`
const restar = (base: Intervalo, quitar: Intervalo[]): Intervalo[] =>
  quitar.reduce<Intervalo[]>(
    (partes, q) =>
      partes.flatMap((p) => {
        if (q.hasta <= p.desde || q.desde >= p.hasta) return [p]
        const resto: Intervalo[] = []
        if (q.desde > p.desde) resto.push({ desde: p.desde, hasta: q.desde })
        if (q.hasta < p.hasta) resto.push({ desde: q.hasta, hasta: p.hasta })
        return resto
      }),
    [base]
  )

// Eventos que sacan al ticket de una pausa sin pasar por un cambio de estado
const TIPOS_QUE_REANUDAN = ['movido', 'soltado', 'desasignado']

// Periodos en que el plazo estuvo detenido: esperando al usuario, resuelto o cerrado
export const periodosPausa = (ticket: Pick<TicketParaTramos, 'estado' | 'fechaCierre'>, eventos: EventoParaTramos[]): Intervalo[] => {
  const periodos: Intervalo[] = []
  let cerradoDesde: number | null = null
  for (const e of eventos) {
    if (e.tipo === 'estado' && ESTADOS_SIN_RELOJ.includes(e.a as EstadoTicket)) {
      if (cerradoDesde === null) cerradoDesde = e.createdAt.getTime()
    } else if ((e.tipo === 'estado' || TIPOS_QUE_REANUDAN.includes(e.tipo)) && cerradoDesde !== null) {
      periodos.push({ desde: cerradoDesde, hasta: e.createdAt.getTime() })
      cerradoDesde = null
    }
  }
  if (cerradoDesde !== null && ESTADOS_EN_PAUSA.includes(ticket.estado as EstadoTicket)) {
    periodos.push({ desde: cerradoDesde, hasta: Infinity })
    return periodos
  }
  if (ticket.estado === 'cerrado') {
    // Tickets cerrados antes del historial no tienen evento: se usa fechaCierre
    const desde = cerradoDesde ?? ticket.fechaCierre?.getTime()
    if (desde !== undefined) periodos.push({ desde, hasta: Infinity })
  }
  return periodos
}

const TIPOS_CON_CAMBIO_DE_PLAZO = ['movido', 'fecha_limite', 'estado', 'prioridad', 'soltado', 'desasignado']

interface CambioDeLimite {
  t: number
  anterior: number
  manual: boolean
}

// Cambios de fecha límite de un reloj: cada evento guarda la anterior
const cambiosDeLimite = (eventos: EventoParaTramos[], anteriorDe: (e: EventoParaTramos) => Date | undefined): CambioDeLimite[] =>
  eventos.flatMap((e) => {
    const anterior = TIPOS_CON_CAMBIO_DE_PLAZO.includes(e.tipo) ? anteriorDe(e) : undefined
    return anterior ? [{ t: e.createdAt.getTime(), anterior: anterior.getTime(), manual: e.tipo === 'fecha_limite' }] : []
  })

// Compara el tiempo abierto con la fecha que valía en cada momento, y con la que valía sin ampliaciones del admin
const evaluarLimites = (abiertos: Intervalo[], cambios: CambioDeLimite[], limiteActual: number | null) => {
  // Fecha límite vigente en el instante t: la "anterior" del primer cambio posterior, o la actual
  const limiteEn = (t: number): number | null => cambios.find((c) => c.t > t)?.anterior ?? limiteActual

  // La que valía antes de cualquier ampliación manual desde el último cálculo automático
  const limiteSinAjusteEn = (t: number): number | null => {
    const automaticos = cambios.filter((c) => !c.manual)
    const inicio = automaticos.filter((c) => c.t <= t).pop()?.t ?? -Infinity
    const proximo = automaticos.find((c) => c.t > t)
    const ampliacion = cambios.find((c) => c.manual && c.t > inicio && c.t < (proximo?.t ?? Infinity))
    if (ampliacion) return ampliacion.anterior
    return proximo?.anterior ?? limiteActual
  }

  let vencido: boolean | null = null
  let vencidoSinAjuste: boolean | null = null
  for (const tramo of abiertos) {
    // Partir el intervalo en los cambios de fecha límite y comparar cada parte con la vigente
    const cortes = [tramo.desde, ...cambios.map((c) => c.t).filter((t) => t > tramo.desde && t < tramo.hasta), tramo.hasta]
    for (let k = 0; k < cortes.length - 1; k++) {
      const limite = limiteEn(cortes[k])
      if (limite === null) continue
      if (cortes[k + 1] > limite) vencido = true
      else if (vencido === null) vencido = false
      const sinAjuste = limiteSinAjusteEn(cortes[k])
      if (sinAjuste !== null && cortes[k + 1] > sinAjuste) vencidoSinAjuste = true
      else if (vencidoSinAjuste === null) vencidoSinAjuste = false
    }
  }
  return { vencido, vencidoSinAjuste, limiteEn }
}

export const calcularTramos = (
  ticket: TicketParaTramos,
  eventos: EventoParaTramos[], // ordenados por fecha
  horario: HorarioLaboral,
  ahora: Date = new Date()
): Tramo[] => {
  const movidos = eventos.filter((e) => e.tipo === 'movido')
  const cerrado = periodosPausa(ticket, eventos)
  const reloj = relojDe(ticket.prioridad, horario)

  // Reloj del área: plazo del tramo. En tickets anteriores, la única fecha que había
  const cambios = cambiosDeLimite(eventos, (e) => e.fechaLimiteAreaAnterior ?? e.fechaLimiteAnterior)
  const limiteActual = (ticket.fechaLimiteArea ?? ticket.fechaLimite)?.getTime() ?? null

  // Resolver termina el tramo: lo que tarde el usuario en confirmar no cuenta
  const salidaPorCierre = ticket.estado === 'cerrado' || ticket.estado === 'resuelto'
    ? (cerrado[cerrado.length - 1]?.desde ?? null)
    : null

  return [null, ...movidos].map((movido, i) => {
    const entrada = movido ? movido.createdAt : ticket.createdAt
    const siguiente = movidos[i]
    const salidaMs = siguiente ? siguiente.createdAt.getTime() : salidaPorCierre
    const finMs = salidaMs ?? ahora.getTime()

    const abiertos = restar({ desde: entrada.getTime(), hasta: finMs }, cerrado)

    const minutos = abiertos.reduce((suma, t) => suma + reloj.minutosEntre(new Date(t.desde), new Date(t.hasta)), 0)
    const { vencido, vencidoSinAjuste, limiteEn } = evaluarLimites(abiertos, cambios, limiteActual)

    const ultimoAbierto = abiertos[abiertos.length - 1]
    const limiteFinal = limiteEn(ultimoAbierto ? ultimoAbierto.hasta - 1 : entrada.getTime())

    return {
      areaId: (movido ? movido.a : movidos[0]?.de ?? ticket.areaId) ?? null,
      area: (movido ? movido.aNombre : movidos[0]?.deNombre ?? ticket.areaNombre) ?? 'Sin área',
      entrada,
      salida: salidaMs === null ? null : new Date(salidaMs),
      minutosLaborales: minutos,
      fechaLimite: limiteFinal === null ? null : new Date(limiteFinal),
      vencido,
      vencidoSinAjuste
    }
  })
}

export type EstadoSla = 'a_tiempo' | 'vencido' | 'en_curso' | 'sin_fecha'

// Resumen de un ticket para reportes: tiempo laboral total y SLA (vencido si se venció en algún tramo)
export const resumenSla = (tramos: Tramo[]): { minutosLaborales: number; sla: EstadoSla; slaSinAjuste: EstadoSla } => {
  const minutosLaborales = tramos.reduce((suma, t) => suma + t.minutosLaborales, 0)
  const ultimo = tramos[tramos.length - 1]
  const estadoSegun = (vencidoDe: (t: Tramo) => boolean | null): EstadoSla => {
    if (tramos.some((t) => vencidoDe(t) === true)) return 'vencido'
    if (tramos.every((t) => vencidoDe(t) === null)) return 'sin_fecha'
    return ultimo && ultimo.salida === null ? 'en_curso' : 'a_tiempo'
  }
  return { minutosLaborales, sla: estadoSegun((t) => t.vencido), slaSinAjuste: estadoSegun((t) => t.vencidoSinAjuste) }
}

// Cumplimiento del ticket completo frente a lo que se le prometió al cliente
export const slaDelTicket = (
  ticket: TicketParaTramos,
  eventos: EventoParaTramos[],
  ahora: Date = new Date()
): { sla: EstadoSla; slaSinAjuste: EstadoSla } => {
  const pausas = periodosPausa(ticket, eventos)
  const termino = ticket.estado === 'cerrado' || ticket.estado === 'resuelto'
  const fin = termino ? (pausas[pausas.length - 1]?.desde ?? ahora.getTime()) : ahora.getTime()
  const abiertos = restar({ desde: ticket.createdAt.getTime(), hasta: fin }, pausas)
  const { vencido, vencidoSinAjuste } = evaluarLimites(
    abiertos,
    cambiosDeLimite(eventos, (e) => e.fechaLimiteAnterior),
    ticket.fechaLimite?.getTime() ?? null
  )
  const estadoDe = (v: boolean | null): EstadoSla => {
    if (v === true) return 'vencido'
    if (v === null) return 'sin_fecha'
    return termino ? 'a_tiempo' : 'en_curso'
  }
  return { sla: estadoDe(vencido), slaSinAjuste: estadoDe(vencidoSinAjuste) }
}
