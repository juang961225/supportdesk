import { calcularTramos, resumenSla, EventoParaTramos, TicketParaTramos, Tramo } from '../src/utils/tramos'
import { HORARIO_POR_DEFECTO } from '../src/utils/horarioLaboral'
import { bog } from './helpers'

const tramosDe = (ticket: TicketParaTramos, eventos: EventoParaTramos[], ahora: string) =>
  calcularTramos(ticket, eventos, HORARIO_POR_DEFECTO, bog(ahora))

describe('calcularTramos', () => {
  it('ticket sin movimientos: un tramo en curso en su área', () => {
    const [tramo, ...resto] = tramosDe(
      { createdAt: bog('2026-10-26T09:00'), estado: 'en_progreso', fechaLimite: bog('2026-10-26T13:00'), areaId: 's', areaNombre: 'Soporte' },
      [],
      '2026-10-26T12:00'
    )
    expect(resto).toHaveLength(0)
    expect(tramo).toMatchObject({ areaId: 's', area: 'Soporte', salida: null, minutosLaborales: 180, vencido: false })
  })

  it('movido, cerrado y reabierto: el tiempo cerrado no cuenta y cada tramo usa su fecha límite', () => {
    const tramos = tramosDe(
      { createdAt: bog('2026-10-26T09:00'), estado: 'reabierto', fechaLimite: bog('2026-10-28T14:00'), areaId: 'r', areaNombre: 'Redes' },
      [
        { tipo: 'movido', createdAt: bog('2026-10-26T15:00'), de: 's', deNombre: 'Soporte', a: 'r', aNombre: 'Redes', fechaLimiteAnterior: bog('2026-10-26T13:00') },
        { tipo: 'estado', createdAt: bog('2026-10-27T08:30'), a: 'cerrado' },
        { tipo: 'estado', createdAt: bog('2026-10-28T10:00'), a: 'reabierto', fechaLimiteAnterior: bog('2026-10-27T09:00') }
      ],
      '2026-10-28T16:00'
    )

    expect(tramos).toHaveLength(2)
    expect(tramos[0]).toMatchObject({
      areaId: 's', area: 'Soporte', entrada: bog('2026-10-26T09:00'), salida: bog('2026-10-26T15:00'),
      minutosLaborales: 360, fechaLimite: bog('2026-10-26T13:00'), vencido: true
    })
    // lun 15–18 (180) + mar 8–8:30 (30) + mié 10–16 (360); cerrado mar 8:30 → mié 10:00 no cuenta
    expect(tramos[1]).toMatchObject({
      areaId: 'r', area: 'Redes', salida: null, minutosLaborales: 570, fechaLimite: bog('2026-10-28T14:00'), vencido: true
    })
  })

  it('ampliar la fecha límite después de vencida no borra el vencimiento', () => {
    const [tramo] = tramosDe(
      { createdAt: bog('2026-10-26T09:00'), estado: 'en_progreso', fechaLimite: bog('2026-10-30T09:00'), areaNombre: 'Soporte' },
      [{ tipo: 'fecha_limite', createdAt: bog('2026-10-26T16:00'), fechaLimiteAnterior: bog('2026-10-26T13:00') }],
      '2026-10-27T10:00'
    )
    expect(tramo.vencido).toBe(true)
    expect(tramo.fechaLimite).toEqual(bog('2026-10-30T09:00'))
  })

  it('ampliar antes de vencer y cerrar a tiempo: a tiempo', () => {
    const [tramo] = tramosDe(
      { createdAt: bog('2026-10-26T09:00'), estado: 'cerrado', fechaCierre: bog('2026-10-27T10:00'), fechaLimite: bog('2026-10-27T12:00'), areaNombre: 'Soporte' },
      [
        { tipo: 'fecha_limite', createdAt: bog('2026-10-26T12:00'), fechaLimiteAnterior: bog('2026-10-26T13:00') },
        { tipo: 'estado', createdAt: bog('2026-10-27T10:00'), a: 'cerrado' }
      ],
      '2026-10-28T10:00'
    )
    expect(tramo).toMatchObject({ salida: bog('2026-10-27T10:00'), minutosLaborales: 660, vencido: false })
  })

  it('ticket antiguo sin fecha límite ni eventos: cierra con fechaCierre y vencido null', () => {
    const [tramo] = tramosDe(
      { createdAt: bog('2026-10-23T17:00'), estado: 'cerrado', fechaCierre: bog('2026-10-26T09:00'), areaNombre: 'General' },
      [],
      '2026-10-28T10:00'
    )
    expect(tramo).toMatchObject({ area: 'General', salida: bog('2026-10-26T09:00'), minutosLaborales: 120, fechaLimite: null, vencido: null })
  })

  it('sin área conocida usa "Sin área"', () => {
    const [tramo] = tramosDe({ createdAt: bog('2026-10-26T09:00'), estado: 'abierto' }, [], '2026-10-26T10:00')
    expect(tramo).toMatchObject({ areaId: null, area: 'Sin área' })
  })
})

describe('resumenSla', () => {
  const tramo = (extra: Partial<Tramo>): Tramo => ({
    areaId: 'a', area: 'A', entrada: bog('2026-10-26T09:00'), salida: bog('2026-10-26T10:00'),
    minutosLaborales: 60, fechaLimite: bog('2026-10-26T13:00'), vencido: false, ...extra
  })

  it('vencido si se venció en cualquier tramo, y suma el tiempo', () => {
    expect(resumenSla([tramo({ vencido: true }), tramo({ minutosLaborales: 30 })])).toEqual({ minutosLaborales: 90, sla: 'vencido' })
  })

  it('en curso si el último tramo sigue abierto y no venció', () => {
    expect(resumenSla([tramo({}), tramo({ salida: null })]).sla).toBe('en_curso')
  })

  it('a tiempo si terminó sin vencer', () => {
    expect(resumenSla([tramo({})]).sla).toBe('a_tiempo')
  })

  it('sin fecha límite si ningún tramo la tiene', () => {
    expect(resumenSla([tramo({ vencido: null })]).sla).toBe('sin_fecha')
  })
})
