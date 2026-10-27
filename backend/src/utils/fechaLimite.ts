import { HorarioLaboral, minutosJornada, sumarMinutosLaborales } from './horarioLaboral'

// Plazo por prioridad en tiempo laboral: horas, o días (1 día = 1 jornada del horario de la marca)
const PLAZOS: Record<string, { horas: number } | { dias: number }> = {
  critica: { horas: 4 },
  alta: { dias: 1 },
  media: { dias: 3 },
  baja: { dias: 5 }
}

const minutosDePlazo = (prioridad: string, horario: HorarioLaboral): number => {
  const plazo = PLAZOS[prioridad] ?? PLAZOS.media
  return 'horas' in plazo ? plazo.horas * 60 : plazo.dias * minutosJornada(horario)
}

// Calcula la fecha límite según la prioridad, contando solo el horario laboral de la marca
export const calcularFechaLimite = (prioridad: string, horario: HorarioLaboral, desde: Date = new Date()): Date =>
  sumarMinutosLaborales(desde, minutosDePlazo(prioridad, horario), horario)
