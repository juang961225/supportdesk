import { HorarioLaboral, minutosLaboralesEntre } from './horarioLaboral'

// Tramos por área de un ticket, calculados desde el historial (funciones puras).
// - Un tramo empieza al crear el ticket o al moverlo de área, y termina al moverlo otra vez o al cerrarlo.
// - El tiempo se mide en horario laboral y no cuenta mientras el ticket está cerrado.
// - Vencido: en algún momento abierto dentro del tramo se pasó la fecha límite vigente en ese momento.

export interface EventoParaTramos {
  tipo: string
  createdAt: Date
  de?: string
  a?: string
  deNombre?: string
  aNombre?: string
  fechaLimiteAnterior?: Date
}

export interface TicketParaTramos {
  createdAt: Date
  estado: string
  fechaCierre?: Date
  fechaLimite?: Date
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
}

interface Intervalo {
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

// Periodos en que el ticket estuvo cerrado (el reloj se pausa)
const periodosCerrado = (ticket: TicketParaTramos, eventos: EventoParaTramos[]): Intervalo[] => {
  const periodos: Intervalo[] = []
  let cerradoDesde: number | null = null
  for (const e of eventos) {
    if (e.tipo !== 'estado') continue
    if (e.a === 'cerrado' && cerradoDesde === null) {
      cerradoDesde = e.createdAt.getTime()
    } else if (e.a === 'reabierto' && cerradoDesde !== null) {
      periodos.push({ desde: cerradoDesde, hasta: e.createdAt.getTime() })
      cerradoDesde = null
    }
  }
  if (ticket.estado === 'cerrado') {
    // Tickets cerrados antes del historial no tienen evento: se usa fechaCierre
    const desde = cerradoDesde ?? ticket.fechaCierre?.getTime()
    if (desde !== undefined) periodos.push({ desde, hasta: Infinity })
  }
  return periodos
}

export const calcularTramos = (
  ticket: TicketParaTramos,
  eventos: EventoParaTramos[], // ordenados por fecha
  horario: HorarioLaboral,
  ahora: Date = new Date()
): Tramo[] => {
  const movidos = eventos.filter((e) => e.tipo === 'movido')
  const cerrado = periodosCerrado(ticket, eventos)

  // Cambios de fecha límite (mover, ajuste del admin, reabrir): cada uno guarda la anterior
  const cambios = eventos
    .filter((e) => e.fechaLimiteAnterior && ['movido', 'fecha_limite', 'estado'].includes(e.tipo))
    .map((e) => ({ t: e.createdAt.getTime(), anterior: (e.fechaLimiteAnterior as Date).getTime() }))

  // Fecha límite vigente en el instante t: la "anterior" del primer cambio posterior, o la actual
  const limiteEn = (t: number): number | null => {
    const siguiente = cambios.find((c) => c.t > t)
    return siguiente ? siguiente.anterior : ticket.fechaLimite?.getTime() ?? null
  }

  const salidaPorCierre = ticket.estado === 'cerrado'
    ? (cerrado[cerrado.length - 1]?.desde ?? null)
    : null

  return [null, ...movidos].map((movido, i) => {
    const entrada = movido ? movido.createdAt : ticket.createdAt
    const siguiente = movidos[i]
    const salidaMs = siguiente ? siguiente.createdAt.getTime() : salidaPorCierre
    const finMs = salidaMs ?? ahora.getTime()

    const abiertos = restar({ desde: entrada.getTime(), hasta: finMs }, cerrado)

    let minutos = 0
    let vencido: boolean | null = null
    for (const tramo of abiertos) {
      minutos += minutosLaboralesEntre(new Date(tramo.desde), new Date(tramo.hasta), horario)
      // Partir el intervalo en los cambios de fecha límite y comparar cada parte con la vigente
      const cortes = [tramo.desde, ...cambios.map((c) => c.t).filter((t) => t > tramo.desde && t < tramo.hasta), tramo.hasta]
      for (let k = 0; k < cortes.length - 1; k++) {
        const limite = limiteEn(cortes[k])
        if (limite === null) continue
        if (cortes[k + 1] > limite) vencido = true
        else if (vencido === null) vencido = false
      }
    }

    const ultimoAbierto = abiertos[abiertos.length - 1]
    const limiteFinal = limiteEn(ultimoAbierto ? ultimoAbierto.hasta - 1 : entrada.getTime())

    return {
      areaId: (movido ? movido.a : movidos[0]?.de ?? ticket.areaId) ?? null,
      area: (movido ? movido.aNombre : movidos[0]?.deNombre ?? ticket.areaNombre) ?? 'Sin área',
      entrada,
      salida: salidaMs === null ? null : new Date(salidaMs),
      minutosLaborales: minutos,
      fechaLimite: limiteFinal === null ? null : new Date(limiteFinal),
      vencido
    }
  })
}
