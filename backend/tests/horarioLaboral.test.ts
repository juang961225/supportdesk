import { calcularFechaLimite } from '../src/utils/fechaLimite'
import {
  HORARIO_POR_DEFECTO,
  HorarioLaboral,
  minutosJornada,
  minutosLaboralesEntre,
  sumarMinutosLaborales,
  validarHorario
} from '../src/utils/horarioLaboral'
import { bog } from './helpers'

// Semana de referencia: lunes 26 oct 2026 – domingo 1 nov 2026. Horario por defecto: lun–vie 08:00–18:00
const conFestivo = (fecha: string): HorarioLaboral => ({ ...HORARIO_POR_DEFECTO, festivos: [fecha] })
const lunASab: HorarioLaboral = { dias: [1, 2, 3, 4, 5, 6], inicio: '08:00', fin: '12:00', festivos: [] }

describe('calcularFechaLimite (tiempo laboral)', () => {
  it.each([
    ['crítica dentro de la jornada', 'critica', '2026-10-26T10:00', '2026-10-26T14:00'],
    ['crítica al final del día pasa a la mañana siguiente', 'critica', '2026-10-26T17:00', '2026-10-27T11:00'],
    ['crítica justo al cierre', 'critica', '2026-10-26T18:00', '2026-10-27T12:00'],
    ['crítica antes de abrir empieza a contar a las 08:00', 'critica', '2026-10-26T06:00', '2026-10-26T12:00'],
    ['alta un viernes por la tarde salta el fin de semana', 'alta', '2026-10-30T17:00', '2026-11-02T17:00'],
    ['crítica un sábado empieza el lunes', 'critica', '2026-10-31T10:00', '2026-11-02T12:00'],
    ['media = 3 jornadas', 'media', '2026-10-28T09:00', '2026-11-02T09:00'],
    ['baja = 5 jornadas', 'baja', '2026-10-28T09:00', '2026-11-04T09:00']
  ])('%s', (_caso, prioridad, desde, esperado) => {
    expect(calcularFechaLimite(prioridad, HORARIO_POR_DEFECTO, bog(desde))).toEqual(bog(esperado))
  })

  it('se salta un festivo', () => {
    expect(calcularFechaLimite('critica', conFestivo('2026-11-02'), bog('2026-10-30T17:00'))).toEqual(bog('2026-11-03T11:00'))
  })

  it('respeta un horario con sábados y jornada corta', () => {
    expect(calcularFechaLimite('critica', lunASab, bog('2026-11-01T23:30'))).toEqual(bog('2026-11-02T12:00'))
    // 1 día = 1 jornada de 4 h
    expect(calcularFechaLimite('alta', lunASab, bog('2026-10-31T11:00'))).toEqual(bog('2026-11-02T11:00'))
  })

  it('una prioridad desconocida usa el plazo de media', () => {
    expect(calcularFechaLimite('rara', HORARIO_POR_DEFECTO, bog('2026-10-28T09:00'))).toEqual(bog('2026-11-02T09:00'))
  })
})

describe('sumarMinutosLaborales', () => {
  it('con 0 minutos devuelve el mismo instante', () => {
    expect(sumarMinutosLaborales(bog('2026-10-31T10:00'), 0, HORARIO_POR_DEFECTO)).toEqual(bog('2026-10-31T10:00'))
  })

  it('sin días laborables cae al tiempo corrido en vez de colgarse', () => {
    const sinDias: HorarioLaboral = { ...HORARIO_POR_DEFECTO, dias: [] }
    expect(sumarMinutosLaborales(bog('2026-10-26T10:00'), 60, sinDias)).toEqual(bog('2026-10-26T11:00'))
  })
})

describe('minutosLaboralesEntre', () => {
  it.each([
    ['dentro de la misma jornada', '2026-10-26T09:00', '2026-10-26T11:30', 150],
    ['cruza la noche', '2026-10-26T17:00', '2026-10-27T09:00', 120],
    ['cruza el fin de semana', '2026-10-30T17:00', '2026-11-02T09:00', 120],
    ['todo fuera de horario', '2026-10-31T09:00', '2026-11-01T20:00', 0],
    ['hasta antes que desde', '2026-10-26T12:00', '2026-10-26T10:00', 0]
  ])('%s', (_caso, desde, hasta, minutos) => {
    expect(minutosLaboralesEntre(bog(desde), bog(hasta), HORARIO_POR_DEFECTO)).toBe(minutos)
  })

  it('no cuenta los festivos', () => {
    expect(minutosLaboralesEntre(bog('2026-10-30T17:00'), bog('2026-11-03T09:00'), conFestivo('2026-11-02'))).toBe(120)
  })

  it('es coherente con sumarMinutosLaborales', () => {
    const desde = bog('2026-10-29T15:20')
    const hasta = sumarMinutosLaborales(desde, 1234, HORARIO_POR_DEFECTO)
    expect(minutosLaboralesEntre(desde, hasta, HORARIO_POR_DEFECTO)).toBe(1234)
  })
})

describe('minutosJornada', () => {
  it('calcula la duración de la jornada', () => {
    expect(minutosJornada(HORARIO_POR_DEFECTO)).toBe(600)
    expect(minutosJornada(lunASab)).toBe(240)
  })
})

describe('validarHorario', () => {
  it('normaliza días y festivos (sin duplicados, ordenados)', () => {
    expect(validarHorario({ dias: [5, 1, 1], inicio: '08:00', fin: '18:00', festivos: ['2026-12-25', '2026-12-08', '2026-12-25'] }))
      .toEqual({ dias: [1, 5], inicio: '08:00', fin: '18:00', festivos: ['2026-12-08', '2026-12-25'] })
  })

  it('festivos es opcional', () => {
    expect(validarHorario({ dias: [1], inicio: '08:00', fin: '17:00' })).toEqual({ dias: [1], inicio: '08:00', fin: '17:00', festivos: [] })
  })

  it.each([
    ['sin cuerpo', null, 'El horario no es válido'],
    ['sin días', { dias: [], inicio: '08:00', fin: '18:00' }, 'Elige al menos un día laborable'],
    ['día fuera de rango', { dias: [7], inicio: '08:00', fin: '18:00' }, 'Los días laborables no son válidos'],
    ['hora sin cero inicial', { dias: [1], inicio: '8:00', fin: '18:00' }, 'Las horas deben tener formato HH:mm'],
    ['inicio después del fin', { dias: [1], inicio: '18:00', fin: '08:00' }, 'La hora de inicio debe ser anterior a la de fin'],
    ['festivo inválido', { dias: [1], inicio: '08:00', fin: '18:00', festivos: ['2026-13-45'] }, 'Las fechas de festivos no son válidas']
  ])('rechaza: %s', (_caso, datos, mensaje) => {
    expect(validarHorario(datos)).toBe(mensaje)
  })
})
