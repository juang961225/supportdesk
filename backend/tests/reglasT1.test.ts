import { calcularTramos, resumenSla } from '../src/utils/tramos'
import { inicioDelPlazo } from '../src/utils/slaActual'
import { HORARIO_POR_DEFECTO } from '../src/utils/horarioLaboral'
import { esquemaComentario, esquemaPrioridadTicket } from '../src/validacion/esquemas'

const bog = (fecha: string): Date => new Date(`${fecha}:00-05:00`)
const TICKET = { createdAt: bog('2026-11-02T09:00'), estado: 'en_progreso', areaNombre: 'Soporte' }
const AHORA = bog('2026-11-06T09:00')

describe('vencido sin contar lo que amplió el admin', () => {
  it('ampliar antes de vencer: cuenta a tiempo, pero se sabe que se habría vencido', () => {
    const eventos = [{ tipo: 'fecha_limite', createdAt: bog('2026-11-02T10:00'), fechaLimiteAnterior: bog('2026-11-03T09:00') }]
    const [tramo] = calcularTramos({ ...TICKET, fechaLimite: bog('2026-11-20T09:00') }, eventos, HORARIO_POR_DEFECTO, AHORA)
    expect(tramo.vencido).toBe(false)
    expect(tramo.vencidoSinAjuste).toBe(true)
  })

  it('sin ajustes las dos cifras coinciden', () => {
    const [tramo] = calcularTramos({ ...TICKET, fechaLimite: bog('2026-11-03T09:00') }, [], HORARIO_POR_DEFECTO, AHORA)
    expect(tramo.vencido).toBe(true)
    expect(tramo.vencidoSinAjuste).toBe(true)
  })

  it('ampliar sin necesidad no marca vencido', () => {
    const eventos = [{ tipo: 'fecha_limite', createdAt: bog('2026-11-02T10:00'), fechaLimiteAnterior: bog('2026-11-10T09:00') }]
    const [tramo] = calcularTramos({ ...TICKET, fechaLimite: bog('2026-11-20T09:00') }, eventos, HORARIO_POR_DEFECTO, AHORA)
    expect(tramo.vencido).toBe(false)
    expect(tramo.vencidoSinAjuste).toBe(false)
  })

  it('corregir la prioridad no cuenta como ampliar: la fecha nueva es la que vale', () => {
    const eventos = [{ tipo: 'prioridad', createdAt: bog('2026-11-02T10:00'), fechaLimiteAnterior: bog('2026-11-02T14:00') }]
    const [tramo] = calcularTramos({ ...TICKET, fechaLimite: bog('2026-11-20T09:00') }, eventos, HORARIO_POR_DEFECTO, AHORA)
    expect(tramo.vencido).toBe(false)
    expect(tramo.vencidoSinAjuste).toBe(false)
  })

  it('tras una ampliación y un movimiento, vale la fecha de antes de ampliar', () => {
    const eventos = [
      { tipo: 'fecha_limite', createdAt: bog('2026-11-02T10:00'), fechaLimiteAnterior: bog('2026-11-02T12:00') },
      { tipo: 'movido', createdAt: bog('2026-11-02T15:00'), fechaLimiteAnterior: bog('2026-11-10T09:00'), de: 'a1', deNombre: 'A', a: 'a2', aNombre: 'B' }
    ]
    const [primero, segundo] = calcularTramos({ ...TICKET, fechaLimite: bog('2026-11-20T09:00') }, eventos, HORARIO_POR_DEFECTO, AHORA)
    expect(primero.vencido).toBe(false)
    expect(primero.vencidoSinAjuste).toBe(true)
    expect(segundo.vencidoSinAjuste).toBe(false)
  })

  it('el resumen del ticket trae las dos cifras', () => {
    const eventos = [{ tipo: 'fecha_limite', createdAt: bog('2026-11-02T10:00'), fechaLimiteAnterior: bog('2026-11-03T09:00') }]
    const cerrado = { ...TICKET, estado: 'cerrado', fechaCierre: bog('2026-11-05T09:00'), fechaLimite: bog('2026-11-20T09:00') }
    const eventosConCierre = [...eventos, { tipo: 'estado', a: 'cerrado', createdAt: bog('2026-11-05T09:00') }]
    expect(resumenSla(calcularTramos(cerrado, eventosConCierre, HORARIO_POR_DEFECTO, AHORA))).toMatchObject({ sla: 'a_tiempo', slaSinAjuste: 'vencido' })
  })
})

describe('inicio del plazo', () => {
  it('corregir la prioridad reinicia el plazo vigente', () => {
    const creado = bog('2026-11-02T09:00')
    const corregido = bog('2026-11-02T11:00')
    expect(inicioDelPlazo(creado, [{ tipo: 'prioridad', createdAt: corregido }])).toEqual(corregido)
  })
})

describe('validación', () => {
  it('corregir la prioridad exige un valor válido y motivo', () => {
    expect(esquemaPrioridadTicket.safeParse({ prioridad: 'alta', motivo: 'Afecta a todos' }).success).toBe(true)
    expect(esquemaPrioridadTicket.safeParse({ prioridad: 'alta', motivo: '  ' }).success).toBe(false)
    expect(esquemaPrioridadTicket.safeParse({ prioridad: 'urgente', motivo: 'x' }).success).toBe(false)
  })

  it('un comentario puede marcarse como nota interna', () => {
    expect(esquemaComentario.parse({ contenido: 'x', interna: 'true' })).toMatchObject({ interna: 'true' })
    expect(esquemaComentario.safeParse({ contenido: 'x', interna: 'tal vez' }).success).toBe(false)
  })
})
