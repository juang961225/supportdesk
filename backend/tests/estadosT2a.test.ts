import { ESTADOS_SIN_RELOJ, aplicarEstado, puedeTransicionar } from '../src/utils/ticketStatus'
import { fechaTrasPausa } from '../src/utils/fechaLimite'
import { calcularSlaActual } from '../src/utils/slaActual'
import { calcularTramos, periodosPausa, resumenSla } from '../src/utils/tramos'
import { HORARIO_POR_DEFECTO } from '../src/utils/horarioLaboral'
import { ITicket } from '../src/models/Ticket'
import { bog } from './helpers'

describe('transiciones', () => {
  it.each([
    ['en_progreso', 'esperando_usuario'],
    ['en_progreso', 'resuelto'],
    ['en_revision', 'esperando_usuario'],
    ['en_revision', 'resuelto'],
    ['esperando_usuario', 'en_progreso'],
    ['esperando_usuario', 'resuelto'],
    ['resuelto', 'cerrado'],
    ['resuelto', 'reabierto'],
    ['resuelto', 'en_progreso']
  ] as const)('%s → %s sí', (de, a) => {
    expect(puedeTransicionar(de, a)).toBe(true)
  })

  it.each([
    ['en_progreso', 'cerrado'],
    ['en_revision', 'cerrado'],
    ['abierto', 'resuelto'],
    ['abierto', 'esperando_usuario'],
    ['esperando_usuario', 'cerrado'],
    ['cerrado', 'reabierto'],
    ['cerrado', 'en_progreso']
  ] as const)('%s → %s no', (de, a) => {
    expect(puedeTransicionar(de, a)).toBe(false)
  })
})

describe('aplicarEstado', () => {
  const ticket = (estado: ITicket['estado'], extra: Partial<ITicket> = {}) => ({ estado, ...extra }) as ITicket

  it('al entrar en pausa guarda desde cuándo, una sola vez', () => {
    const t = ticket('en_progreso')
    aplicarEstado(t, 'esperando_usuario')
    const desde = t.pausadoDesde
    expect(desde).toBeInstanceOf(Date)
    aplicarEstado(t, 'resuelto')
    expect(t.pausadoDesde).toBe(desde)
  })

  it('al salir de la pausa la limpia', () => {
    const t = ticket('esperando_usuario', { pausadoDesde: new Date() })
    aplicarEstado(t, 'en_progreso')
    expect(t.pausadoDesde).toBeUndefined()
  })

  it('cerrar pone la fecha de cierre', () => {
    const t = ticket('resuelto', { pausadoDesde: new Date() })
    aplicarEstado(t, 'cerrado')
    expect(t.fechaCierre).toBeInstanceOf(Date)
  })
})

describe('fechaTrasPausa', () => {
  it('conserva el tiempo que quedaba al pausar', () => {
    // Pausado lunes 12:00 con 2 h restantes; se reanuda el martes 09:00
    expect(fechaTrasPausa(bog('2026-10-26T14:00'), bog('2026-10-26T12:00'), bog('2026-10-27T09:00'), HORARIO_POR_DEFECTO)).toEqual(bog('2026-10-27T11:00'))
  })

  it('cuenta en horario laboral, sin fines de semana', () => {
    // Quedaban 2 h; se reanuda viernes 17:00 con jornada hasta las 18:00 → lunes 09:00
    expect(fechaTrasPausa(bog('2026-10-26T14:00'), bog('2026-10-26T12:00'), bog('2026-10-30T17:00'), HORARIO_POR_DEFECTO)).toEqual(bog('2026-11-02T09:00'))
  })

  it('si ya estaba vencido al pausar, no le regala tiempo', () => {
    const limite = bog('2026-10-26T10:00')
    expect(fechaTrasPausa(limite, bog('2026-10-26T12:00'), bog('2026-10-27T09:00'), HORARIO_POR_DEFECTO)).toEqual(limite)
  })
})

describe('el tiempo no corre en pausa', () => {
  const inicio = bog('2026-10-26T09:00')
  const eventosPausa = [
    { tipo: 'estado', a: 'esperando_usuario', createdAt: bog('2026-10-26T10:00') },
    { tipo: 'estado', a: 'en_progreso', createdAt: bog('2026-10-26T15:00'), fechaLimiteAnterior: bog('2026-10-26T13:00') }
  ]
  const abierto = { createdAt: inicio, estado: 'en_progreso', fechaLimite: bog('2026-10-26T18:00'), areaNombre: 'A' }

  it('detecta el periodo en pausa', () => {
    expect(periodosPausa(abierto, eventosPausa)).toEqual([{ desde: bog('2026-10-26T10:00').getTime(), hasta: bog('2026-10-26T15:00').getTime() }])
  })

  it('el tiempo laboral del tramo no incluye la pausa', () => {
    const [tramo] = calcularTramos(abierto, eventosPausa, HORARIO_POR_DEFECTO, bog('2026-10-26T16:00'))
    expect(tramo.minutosLaborales).toBe(120) // 09–10 y 15–16
  })

  it('pasar el plazo original durante la pausa no lo vence', () => {
    const [tramo] = calcularTramos(abierto, eventosPausa, HORARIO_POR_DEFECTO, bog('2026-10-26T16:00'))
    expect(tramo.vencido).toBe(false)
  })

  it('salir de la pausa al mover o soltar también la termina', () => {
    const eventos = [
      { tipo: 'estado', a: 'esperando_usuario', createdAt: bog('2026-10-26T10:00') },
      { tipo: 'soltado', createdAt: bog('2026-10-26T11:00') }
    ]
    expect(periodosPausa({ ...abierto, estado: 'abierto' }, eventos)).toEqual([{ desde: bog('2026-10-26T10:00').getTime(), hasta: bog('2026-10-26T11:00').getTime() }])
  })

  it('Resuelto termina el tramo aunque aún no se cierre', () => {
    const eventos = [{ tipo: 'estado', a: 'resuelto', createdAt: bog('2026-10-26T11:00') }]
    const tramos = calcularTramos({ ...abierto, estado: 'resuelto' }, eventos, HORARIO_POR_DEFECTO, bog('2026-10-28T09:00'))
    expect(tramos[0].salida).toEqual(bog('2026-10-26T11:00'))
    expect(tramos[0].minutosLaborales).toBe(120)
    expect(resumenSla(tramos).sla).toBe('a_tiempo')
  })

  it('confirmar después de Resuelto no alarga el tiempo', () => {
    const eventos = [
      { tipo: 'estado', a: 'resuelto', createdAt: bog('2026-10-26T11:00') },
      { tipo: 'estado', a: 'cerrado', createdAt: bog('2026-10-28T09:00') }
    ]
    const [tramo] = calcularTramos({ ...abierto, estado: 'cerrado', fechaCierre: bog('2026-10-28T09:00') }, eventos, HORARIO_POR_DEFECTO, bog('2026-10-29T09:00'))
    expect(tramo.salida).toEqual(bog('2026-10-26T11:00'))
    expect(tramo.minutosLaborales).toBe(120)
  })
})

describe('SLA actual', () => {
  it.each(ESTADOS_SIN_RELOJ)('en %s no hay barra ni vencimiento', (estado) => {
    const ticket = { estado, inicioPlazo: bog('2026-10-26T09:00'), fechaLimite: bog('2026-10-26T10:00') }
    expect(calcularSlaActual(ticket, HORARIO_POR_DEFECTO, bog('2026-10-27T09:00'))).toBeNull()
  })

  it('el porcentaje descuenta el tiempo en pausa', () => {
    // 4 h de plazo; 1 h consumida, 5 h en pausa y la fecha corrida esas 5 h: faltan 3 de 4 → 25 %
    const ticket = { estado: 'en_progreso', inicioPlazo: bog('2026-10-26T09:00'), fechaLimite: bog('2026-10-26T18:00') }
    const pausas = [{ desde: bog('2026-10-26T10:00').getTime(), hasta: bog('2026-10-26T15:00').getTime() }]
    expect(calcularSlaActual(ticket, HORARIO_POR_DEFECTO, bog('2026-10-26T15:00'), pausas)?.porcentaje).toBe(25)
  })
})
