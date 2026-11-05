import { HorarioLaboral, minutosJornada, minutosLaboralesEntre, sumarMinutosLaborales } from './horarioLaboral'

// Plazos por prioridad en tiempo laboral: horas, o días (1 día = 1 jornada del horario de la marca).
// El admin define los de la marca y, si hace falta, los ajusta por área.

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

const minutosDePlazo = (prioridad: string, horario: HorarioLaboral, plazos: Plazos): number => {
  const plazo = plazos[prioridad as Prioridad] ?? plazos.media
  return plazo.unidad === 'horas' ? plazo.valor * 60 : plazo.valor * minutosJornada(horario)
}

// Calcula la fecha límite según la prioridad, contando solo el horario laboral de la marca
export const calcularFechaLimite = (
  prioridad: string,
  horario: HorarioLaboral,
  desde: Date = new Date(),
  plazos: Plazos = PLAZOS_POR_DEFECTO
): Date => sumarMinutosLaborales(desde, minutosDePlazo(prioridad, horario, plazos), horario)

// Al terminar una pausa, el ticket conserva el tiempo que le quedaba. Si ya estaba vencido, sigue vencido.
export const fechaTrasPausa = (limite: Date, pausadoDesde: Date, ahora: Date, horario: HorarioLaboral): Date => {
  if (limite.getTime() <= pausadoDesde.getTime()) return limite
  return sumarMinutosLaborales(ahora, minutosLaboralesEntre(pausadoDesde, limite, horario), horario)
}
