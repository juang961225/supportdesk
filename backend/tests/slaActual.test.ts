import { calcularSlaActual, inicioDelPlazo } from '../src/utils/slaActual'
import { HORARIO_POR_DEFECTO } from '../src/utils/horarioLaboral'
import { bog } from './helpers'

// Crítico creado lun 10:00 → vence lun 14:00 (4 h laborales)
const critico = { estado: 'en_progreso', inicioPlazo: bog('2026-10-26T10:00'), fechaLimite: bog('2026-10-26T14:00') }
const sla = (ahora: string, ticket = critico) => calcularSlaActual(ticket, HORARIO_POR_DEFECTO, bog(ahora))

describe('calcularSlaActual', () => {
  it.each([
    ['recién creado', '2026-10-26T10:00', 0, 240, 'ok'],
    ['a la mitad pasa a atención', '2026-10-26T12:00', 50, 120, 'atencion'],
    ['al 75% pasa a "vence pronto"', '2026-10-26T13:00', 75, 60, 'pronto'],
    ['casi al final', '2026-10-26T13:54', 98, 6, 'pronto']
  ])('%s', (_caso, ahora, porcentaje, restante, nivel) => {
    expect(sla(ahora)).toEqual({ porcentaje, restanteMinutos: restante, vencidoHaceMinutos: 0, minutosJornada: 600, nivel })
  })

  it('vencido: 100% y minutos reales desde el vencimiento', () => {
    expect(sla('2026-10-26T16:30')).toEqual({ porcentaje: 100, restanteMinutos: 0, vencidoHaceMinutos: 150, minutosJornada: 600, nivel: 'vencido' })
  })

  it('el tiempo fuera de horario no consume el plazo', () => {
    // Alta creado lun 17:00 → vence mar 17:00 (1 jornada). A las 23:00 del lunes solo pasó 1 h laboral de 10
    const alta = { estado: 'abierto', inicioPlazo: bog('2026-10-26T17:00'), fechaLimite: bog('2026-10-27T17:00') }
    expect(sla('2026-10-26T23:00', alta)).toMatchObject({ porcentaje: 10, restanteMinutos: 540, nivel: 'ok' })
  })

  it('sin SLA si está cerrado o no tiene fecha límite', () => {
    expect(sla('2026-10-26T12:00', { ...critico, estado: 'cerrado' })).toBeNull()
    expect(calcularSlaActual({ estado: 'abierto', inicioPlazo: bog('2026-10-26T10:00'), fechaLimite: null }, HORARIO_POR_DEFECTO)).toBeNull()
  })
})

describe('inicioDelPlazo', () => {
  it('es la creación si nunca se movió ni reabrió', () => {
    expect(inicioDelPlazo(bog('2026-10-26T10:00'), [])).toEqual(bog('2026-10-26T10:00'))
  })

  it('es el último mover o reabrir; los demás eventos no cuentan', () => {
    expect(inicioDelPlazo(bog('2026-10-26T10:00'), [
      { tipo: 'movido', createdAt: bog('2026-10-26T12:00') },
      { tipo: 'estado', a: 'reabierto', createdAt: bog('2026-10-27T09:00') },
      { tipo: 'estado', a: 'cerrado', createdAt: bog('2026-10-27T15:00') },
      { tipo: 'fecha_limite', createdAt: bog('2026-10-27T16:00') }
    ])).toEqual(bog('2026-10-27T09:00'))
  })
})
