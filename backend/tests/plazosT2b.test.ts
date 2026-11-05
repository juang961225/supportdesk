import { calcularFechaLimite, corre24x7, fechaTrasPausa, PLAZOS_POR_DEFECTO, relojDe } from '../src/utils/fechaLimite'
import { HORARIO_POR_DEFECTO } from '../src/utils/horarioLaboral'
import { calcularSlaActual, inicioDelPlazo, inicioDelPlazoArea } from '../src/utils/slaActual'
import { calcularTramos, slaDelTicket } from '../src/utils/tramos'
import { ticketParaRol } from '../src/utils/privacidadTicket'
import { bog } from './helpers'

describe('Críticos 24/7', () => {
  it('solo Crítica corre de seguido', () => {
    expect(corre24x7('critica')).toBe(true)
    for (const p of ['alta', 'media', 'baja', undefined]) expect(corre24x7(p)).toBe(false)
  })

  it.each([
    ['de noche', '2026-10-26T22:00', '2026-10-27T02:00'],
    ['viernes por la tarde', '2026-10-30T17:00', '2026-10-30T21:00'],
    ['en fin de semana', '2026-10-31T10:00', '2026-10-31T14:00']
  ])('cuenta horas seguidas %s', (_caso, desde, esperado) => {
    expect(calcularFechaLimite('critica', HORARIO_POR_DEFECTO, bog(desde))).toEqual(bog(esperado))
  })

  it('en un festivo también corre', () => {
    const festivo = { ...HORARIO_POR_DEFECTO, festivos: ['2026-10-26'] }
    expect(calcularFechaLimite('critica', festivo, bog('2026-10-26T10:00'))).toEqual(bog('2026-10-26T14:00'))
  })

  it('un día en Crítica son 24 horas, no una jornada', () => {
    const plazos = { ...PLAZOS_POR_DEFECTO, critica: { valor: 1, unidad: 'dias' as const } }
    expect(calcularFechaLimite('critica', HORARIO_POR_DEFECTO, bog('2026-10-26T10:00'), plazos)).toEqual(bog('2026-10-27T10:00'))
  })

  it('las demás prioridades siguen en horario laboral', () => {
    expect(calcularFechaLimite('alta', HORARIO_POR_DEFECTO, bog('2026-10-30T17:00'))).toEqual(bog('2026-11-02T17:00'))
  })

  it('al salir de pausa conserva las horas seguidas que quedaban', () => {
    // Pausado viernes 18:00 con 3 h restantes; se reanuda sábado 10:00
    expect(fechaTrasPausa(bog('2026-10-30T21:00'), bog('2026-10-30T18:00'), bog('2026-10-31T10:00'), HORARIO_POR_DEFECTO, 'critica')).toEqual(bog('2026-10-31T13:00'))
  })

  it('la barra cuenta horas seguidas y no habla de jornadas', () => {
    const ticket = { estado: 'en_progreso', prioridad: 'critica', inicioPlazo: bog('2026-10-30T20:00'), fechaLimite: bog('2026-10-31T00:00') }
    expect(calcularSlaActual(ticket, HORARIO_POR_DEFECTO, bog('2026-10-30T22:00'))).toMatchObject({ porcentaje: 50, restanteMinutos: 120, minutosJornada: 0 })
  })

  it('el tiempo por área de un Crítico también cuenta de noche', () => {
    const ticket = { createdAt: bog('2026-10-26T20:00'), estado: 'en_progreso', prioridad: 'critica', fechaLimite: bog('2026-10-27T00:00'), areaNombre: 'A' }
    expect(calcularTramos(ticket, [], HORARIO_POR_DEFECTO, bog('2026-10-26T22:00'))[0].minutosLaborales).toBe(120)
    expect(relojDe('critica', HORARIO_POR_DEFECTO).minutosJornada).toBe(0)
  })
})

describe('dos plazos', () => {
  const creado = bog('2026-10-26T09:00')

  describe('inicio', () => {
    const movidoNuevo = { tipo: 'movido', createdAt: bog('2026-10-26T12:00'), fechaLimiteAreaAnterior: bog('2026-10-26T15:00') }

    it('mover no reinicia el plazo del ticket, pero sí el del área', () => {
      expect(inicioDelPlazo(creado, [movidoNuevo])).toEqual(creado)
      expect(inicioDelPlazoArea(creado, [movidoNuevo])).toEqual(movidoNuevo.createdAt)
    })

    it('un ticket movido antes del cambio conserva su fecha nueva como inicio', () => {
      const anterior = { tipo: 'movido', createdAt: bog('2026-10-26T12:00') }
      expect(inicioDelPlazo(creado, [anterior])).toEqual(anterior.createdAt)
    })

    it('corregir la prioridad reinicia los dos', () => {
      const prioridad = { tipo: 'prioridad', createdAt: bog('2026-10-26T12:00') }
      expect(inicioDelPlazo(creado, [prioridad])).toEqual(prioridad.createdAt)
      expect(inicioDelPlazoArea(creado, [prioridad])).toEqual(prioridad.createdAt)
    })
  })

  describe('vencimientos', () => {
    const ticket = {
      createdAt: creado,
      estado: 'en_progreso',
      fechaLimite: bog('2026-10-28T09:00'), // el prometido, sin cambios
      fechaLimiteArea: bog('2026-10-27T15:00'), // el del tramo en B
      areaNombre: 'B'
    }
    const movido = {
      tipo: 'movido', createdAt: bog('2026-10-27T09:00'),
      fechaLimiteAreaAnterior: bog('2026-10-26T12:00'), // venció en A
      de: 'a1', deNombre: 'A', a: 'a2', aNombre: 'B'
    }

    it('vencerse en un área no vence al ticket', () => {
      const ahora = bog('2026-10-27T10:00')
      const [enA, enB] = calcularTramos(ticket, [movido], HORARIO_POR_DEFECTO, ahora)
      expect(enA).toMatchObject({ area: 'A', vencido: true })
      expect(enB).toMatchObject({ area: 'B', vencido: false, fechaLimite: bog('2026-10-27T15:00') })
      expect(slaDelTicket(ticket, [movido], ahora).sla).toBe('en_curso')
    })

    it('mover no salva al ticket: se vence con su plazo original', () => {
      const vencido = { ...ticket, fechaLimite: bog('2026-10-26T15:00') }
      expect(slaDelTicket(vencido, [movido], bog('2026-10-27T10:00')).sla).toBe('vencido')
    })

    it('terminar a tiempo cuenta a tiempo, aunque un área se haya pasado', () => {
      const eventos = [movido, { tipo: 'estado', a: 'resuelto', createdAt: bog('2026-10-27T11:00') }]
      expect(slaDelTicket({ ...ticket, estado: 'resuelto' }, eventos, bog('2026-10-29T09:00')).sla).toBe('a_tiempo')
    })

    it('ampliar a mano se sigue notando en el ticket', () => {
      const eventos = [{ tipo: 'fecha_limite', createdAt: bog('2026-10-26T10:00'), fechaLimiteAnterior: bog('2026-10-26T12:00') }]
      expect(slaDelTicket(ticket, eventos, bog('2026-10-27T10:00'))).toEqual({ sla: 'en_curso', slaSinAjuste: 'vencido' })
    })

    it('sin fecha del área, un ticket anterior usa la única que tiene', () => {
      const anterior = { createdAt: creado, estado: 'en_progreso', fechaLimite: bog('2026-10-26T12:00'), areaNombre: 'A' }
      expect(calcularTramos(anterior, [], HORARIO_POR_DEFECTO, bog('2026-10-27T10:00'))[0]).toMatchObject({ vencido: true, fechaLimite: bog('2026-10-26T12:00') })
    })
  })

  it('el usuario final no recibe el plazo interno', () => {
    const visible = ticketParaRol({ estado: 'en_progreso', fechaLimite: 'prometida', fechaLimiteArea: 'interna', sla: { nivel: 'ok' }, slaArea: { nivel: 'pronto' } }, 'usuario')
    expect(visible).toHaveProperty('fechaLimite', 'prometida')
    expect(visible).toHaveProperty('sla')
    expect(visible).not.toHaveProperty('fechaLimiteArea')
    expect(visible).not.toHaveProperty('slaArea')
  })

  it('el equipo sí lo recibe', () => {
    const ticket = { fechaLimiteArea: 'interna', slaArea: { nivel: 'pronto' } }
    expect(ticketParaRol(ticket, 'soporte')).toEqual(ticket)
  })
})
