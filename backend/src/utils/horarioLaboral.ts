// Horario laboral de una marca y cálculos de tiempo laboral (funciones puras).
// Las horas se interpretan en hora de Colombia: UTC-5 fijo (no tiene horario de verano).

export interface HorarioLaboral {
  dias: number[]      // 0 = domingo … 6 = sábado
  inicio: string      // "HH:mm"
  fin: string         // "HH:mm"
  festivos: string[]  // "AAAA-MM-DD", no laborables
}

export const HORARIO_POR_DEFECTO: HorarioLaboral = {
  dias: [1, 2, 3, 4, 5],
  inicio: '08:00',
  fin: '18:00',
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

// Minutos de una jornada (ej. 08:00–18:00 → 600). "1 día laboral" equivale a una jornada
export const minutosJornada = (horario: HorarioLaboral): number => aMinutos(horario.fin) - aMinutos(horario.inicio)

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

  const abreMs = aMinutos(horario.inicio) * MINUTO_MS
  const cierraMs = aMinutos(horario.fin) * MINUTO_MS
  let t = desde.getTime()

  for (let i = 0; i < MAX_DIAS_BUSQUEDA; i++) {
    const dia = inicioDiaLocal(t)
    if (esDiaLaborable(dia, horario)) {
      const desdeAqui = Math.max(t, dia + abreMs)
      const cierra = dia + cierraMs
      if (desdeAqui < cierra) {
        const disponibles = (cierra - desdeAqui) / MINUTO_MS
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
  const { dias, inicio, fin, festivos } = datos as Record<string, unknown>

  if (!Array.isArray(dias) || dias.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
    return 'Los días laborables no son válidos'
  }
  const diasUnicos = [...new Set(dias as number[])].sort()
  if (diasUnicos.length === 0) return 'Elige al menos un día laborable'

  if (typeof inicio !== 'string' || typeof fin !== 'string' || !HORA_RE.test(inicio) || !HORA_RE.test(fin)) {
    return 'Las horas deben tener formato HH:mm'
  }
  if (aMinutos(inicio) >= aMinutos(fin)) return 'La hora de inicio debe ser anterior a la de fin'

  const listaFestivos = festivos ?? []
  if (!Array.isArray(listaFestivos) || listaFestivos.some((f) => typeof f !== 'string' || !FECHA_RE.test(f) || Number.isNaN(Date.parse(f)))) {
    return 'Las fechas de festivos no son válidas'
  }
  if (listaFestivos.length > 200) return 'Demasiados festivos (máximo 200)'

  return { dias: diasUnicos, inicio, fin, festivos: [...new Set(listaFestivos as string[])].sort() }
}
