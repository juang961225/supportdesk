// Horario laboral de una marca y cálculos de tiempo laboral (funciones puras).
// Las horas se interpretan en hora de Colombia: UTC-5 fijo (no tiene horario de verano).

export interface HorarioLaboral {
  dias: number[]      // 0 = domingo … 6 = sábado
  inicio: string      // "HH:mm"
  fin: string         // "HH:mm"
  pausa: { inicio: string; fin: string } | null // almuerzo: el reloj no corre (opcional)
  festivos: string[]  // "AAAA-MM-DD", no laborables
}

export const HORARIO_POR_DEFECTO: HorarioLaboral = {
  dias: [1, 2, 3, 4, 5],
  inicio: '08:00',
  fin: '18:00',
  pausa: null,
  festivos: []
}

const OFFSET_MS = -5 * 60 * 60 * 1000
const MINUTO_MS = 60 * 1000
const DIA_MS = 24 * 60 * MINUTO_MS
const MAX_DIAS_BUSQUEDA = 3 * 366 // corta el bucle si el horario no tiene días laborables

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/

export const aMinutos = (hora: string): number => {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

// Franjas de atención de un día, en minutos desde las 00:00: [inicio, fin) sin la pausa
// (08:30–17:00 con pausa 12:30–13:00 → [[510, 750], [780, 1020]])
export const franjasDelDia = (horario: HorarioLaboral): [number, number][] => {
  const inicio = aMinutos(horario.inicio)
  const fin = aMinutos(horario.fin)
  if (!horario.pausa) return [[inicio, fin]]
  return [[inicio, aMinutos(horario.pausa.inicio)], [aMinutos(horario.pausa.fin), fin]]
}

// Minutos de una jornada sin la pausa (ej. 08:30–17:00 con 30 min de almuerzo → 480). "1 día laboral" = una jornada
export const minutosJornada = (horario: HorarioLaboral): number =>
  franjasDelDia(horario).reduce((suma, [desde, hasta]) => suma + (hasta - desde), 0)

// 00:00 (hora Colombia) del día que contiene el instante `t`, en ms
const inicioDiaLocal = (t: number): number => {
  const local = t + OFFSET_MS
  return local - (((local % DIA_MS) + DIA_MS) % DIA_MS) - OFFSET_MS
}

const esDiaLaborable = (inicioDia: number, horario: HorarioLaboral): boolean => {
  const fecha = new Date(inicioDia + OFFSET_MS) // leída con getUTC* da la fecha en hora Colombia
  return horario.dias.includes(fecha.getUTCDay()) && !horario.festivos.includes(fecha.toISOString().slice(0, 10))
}

// Suma `minutos` de tiempo laboral a partir de `desde`, saltando noches, días no laborables y festivos
export const sumarMinutosLaborales = (desde: Date, minutos: number, horario: HorarioLaboral): Date => {
  let restante = minutos
  if (restante <= 0) return new Date(desde)

  const franjas = franjasDelDia(horario).map(([a, b]) => [a * MINUTO_MS, b * MINUTO_MS] as const)
  let t = desde.getTime()

  for (let i = 0; i < MAX_DIAS_BUSQUEDA; i++) {
    const dia = inicioDiaLocal(t)
    if (esDiaLaborable(dia, horario)) {
      for (const [abre, cierra] of franjas) {
        const desdeAqui = Math.max(t, dia + abre)
        if (desdeAqui >= dia + cierra) continue
        const disponibles = (dia + cierra - desdeAqui) / MINUTO_MS
        if (restante <= disponibles) return new Date(desdeAqui + restante * MINUTO_MS)
        restante -= disponibles
      }
    }
    t = dia + DIA_MS
  }

  // Horario sin días laborables (no debería pasar: se valida al guardar) → tiempo corrido
  return new Date(desde.getTime() + minutos * MINUTO_MS)
}

// Valida y normaliza un horario recibido del cliente. Devuelve el horario o el mensaje de error
export const validarHorario = (datos: unknown): HorarioLaboral | string => {
  if (typeof datos !== 'object' || datos === null) return 'El horario no es válido'
  const { dias, inicio, fin, pausa, festivos } = datos as Record<string, unknown>

  if (!Array.isArray(dias) || dias.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
    return 'Los días laborables no son válidos'
  }
  const diasUnicos = [...new Set(dias as number[])].sort()
  if (diasUnicos.length === 0) return 'Elige al menos un día laborable'

  if (typeof inicio !== 'string' || typeof fin !== 'string' || !HORA_RE.test(inicio) || !HORA_RE.test(fin)) {
    return 'Las horas deben tener formato HH:mm'
  }
  if (aMinutos(inicio) >= aMinutos(fin)) return 'La hora de inicio debe ser anterior a la de fin'

  // Pausa opcional: debe quedar dentro de la jornada, sin tocar la entrada ni la salida
  let pausaValida: HorarioLaboral['pausa'] = null
  if (pausa !== undefined && pausa !== null) {
    const { inicio: pInicio, fin: pFin } = (typeof pausa === 'object' ? pausa : {}) as Record<string, unknown>
    if (typeof pInicio !== 'string' || typeof pFin !== 'string' || !HORA_RE.test(pInicio) || !HORA_RE.test(pFin)) {
      return 'Las horas de la pausa deben tener formato HH:mm'
    }
    if (!(aMinutos(inicio) < aMinutos(pInicio) && aMinutos(pInicio) < aMinutos(pFin) && aMinutos(pFin) < aMinutos(fin))) {
      return 'La pausa debe empezar después de la entrada, terminar antes de la salida y durar algo'
    }
    pausaValida = { inicio: pInicio, fin: pFin }
  }

  const listaFestivos = festivos ?? []
  if (!Array.isArray(listaFestivos) || listaFestivos.some((f) => typeof f !== 'string' || !FECHA_RE.test(f) || Number.isNaN(Date.parse(f)))) {
    return 'Las fechas de festivos no son válidas'
  }
  if (listaFestivos.length > 200) return 'Demasiados festivos (máximo 200)'

  return { dias: diasUnicos, inicio, fin, pausa: pausaValida, festivos: [...new Set(listaFestivos as string[])].sort() }
}

// Minutos de tiempo laboral entre dos instantes (0 si hasta <= desde)
export const minutosLaboralesEntre = (desde: Date, hasta: Date, horario: HorarioLaboral): number => {
  const fin = hasta.getTime()
  let t = desde.getTime()
  if (fin <= t) return 0

  const franjas = franjasDelDia(horario).map(([a, b]) => [a * MINUTO_MS, b * MINUTO_MS] as const)
  let total = 0

  while (t < fin) {
    const dia = inicioDiaLocal(t)
    if (esDiaLaborable(dia, horario)) {
      for (const [abre, cierra] of franjas) {
        const desdeAqui = Math.max(t, dia + abre)
        const hastaAqui = Math.min(fin, dia + cierra)
        if (hastaAqui > desdeAqui) total += hastaAqui - desdeAqui
      }
    }
    t = dia + DIA_MS
  }
  return Math.round(total / MINUTO_MS)
}
