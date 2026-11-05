import { HorarioLaboral, minutosJornada, minutosLaboralesEntre, sumarMinutosLaborales } from './horarioLaboral'

// Plazos por prioridad: horas, o días (1 día = 1 jornada del horario de la marca; en Crítica, 24 horas).
// Los de la marca dan el plazo del ticket, el que se promete al cliente y no se reinicia al mover.
// El ajuste del área da el plazo del tramo: mide internamente cada paso por un área.

export type Prioridad = 'critica' | 'alta' | 'media' | 'baja'

export interface Plazo {
  valor: number
  unidad: 'horas' | 'dias'
}

export type Plazos = Record<Prioridad, Plazo>
export type AjustePlazos = Partial<Record<Prioridad, Plazo | null>>

export const PLAZOS_POR_DEFECTO: Plazos = {
  critica: { valor: 4, unidad: 'horas' },
  alta: { valor: 1, unidad: 'dias' },
  media: { valor: 3, unidad: 'dias' },
  baja: { valor: 5, unidad: 'dias' }
}

const PRIORIDADES = Object.keys(PLAZOS_POR_DEFECTO) as Prioridad[]

// Lo que viene de la base solo reemplaza si está completo
const soloDefinidos = (ajuste: AjustePlazos | null | undefined): Partial<Plazos> => {
  const definidos: Partial<Plazos> = {}
  for (const prioridad of PRIORIDADES) {
    const plazo = ajuste?.[prioridad]
    if (plazo?.valor && plazo.unidad) definidos[prioridad] = { valor: plazo.valor, unidad: plazo.unidad }
  }
  return definidos
}

// Lo del área manda sobre lo de la marca, y lo de la marca sobre los valores por defecto
export const resolverPlazos = (marca?: AjustePlazos | null, area?: AjustePlazos | null): Plazos => ({
  ...PLAZOS_POR_DEFECTO,
  ...soloDefinidos(marca),
  ...soloDefinidos(area)
})

// Cómo se cuenta el tiempo. Crítica corre 24/7, también de noche, en fin de semana y en festivos;
// las demás prioridades cuentan solo el horario laboral de la marca.
export interface Reloj {
  minutosEntre: (desde: Date, hasta: Date) => number
  sumar: (desde: Date, minutos: number) => Date
  minutosJornada: number // 0: el tiempo se muestra en horas seguidas, no en días de jornada
}

const MINUTO_MS = 60 * 1000
const MINUTOS_DIA = 24 * 60

export const corre24x7 = (prioridad: string | undefined): boolean => prioridad === 'critica'

export const relojDe = (prioridad: string | undefined, horario: HorarioLaboral): Reloj =>
  corre24x7(prioridad)
    ? {
        minutosEntre: (desde, hasta) => Math.max(0, Math.round((hasta.getTime() - desde.getTime()) / MINUTO_MS)),
        sumar: (desde, minutos) => new Date(desde.getTime() + minutos * MINUTO_MS),
        minutosJornada: 0
      }
    : {
        minutosEntre: (desde, hasta) => minutosLaboralesEntre(desde, hasta, horario),
        sumar: (desde, minutos) => sumarMinutosLaborales(desde, minutos, horario),
        minutosJornada: minutosJornada(horario)
      }

const minutosDePlazo = (prioridad: string, horario: HorarioLaboral, plazos: Plazos): number => {
  const plazo = plazos[prioridad as Prioridad] ?? plazos.media
  if (plazo.unidad === 'horas') return plazo.valor * 60
  return plazo.valor * (corre24x7(prioridad) ? MINUTOS_DIA : minutosJornada(horario))
}

// Calcula la fecha límite según la prioridad
export const calcularFechaLimite = (
  prioridad: string,
  horario: HorarioLaboral,
  desde: Date = new Date(),
  plazos: Plazos = PLAZOS_POR_DEFECTO
): Date => relojDe(prioridad, horario).sumar(desde, minutosDePlazo(prioridad, horario, plazos))

// Al terminar una pausa, el ticket conserva el tiempo que le quedaba. Si ya estaba vencido, sigue vencido.
export const fechaTrasPausa = (
  limite: Date,
  pausadoDesde: Date,
  ahora: Date,
  horario: HorarioLaboral,
  prioridad?: string
): Date => {
  if (limite.getTime() <= pausadoDesde.getTime()) return limite
  const reloj = relojDe(prioridad, horario)
  return reloj.sumar(ahora, reloj.minutosEntre(pausadoDesde, limite))
}
