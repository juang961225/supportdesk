import { accionDePausa, avisoDePlazo, tareasActivas } from '../src/utils/tareas'
import { SlaActual } from '../src/utils/slaActual'
import { revisarEntorno } from '../src/config/entorno'
import { HORARIO_POR_DEFECTO } from '../src/utils/horarioLaboral'
import { bog } from './helpers'

const sla = (nivel: SlaActual['nivel']): SlaActual => ({ porcentaje: 0, restanteMinutos: 0, vencidoHaceMinutos: 0, minutosJornada: 600, nivel })
const AHORA = bog('2026-11-04T10:00')
const LIMITE = bog('2026-11-04T09:00')
const LIMITE_AREA = bog('2026-11-04T08:00')
const FUTURO = bog('2026-11-05T09:00')

describe('avisoDePlazo', () => {
  it('sin riesgo no hace nada', () => {
    expect(avisoDePlazo({ fechaLimite: FUTURO }, sla('ok'), sla('ok'), AHORA)).toEqual({ marcas: {}, enviar: null })
    expect(avisoDePlazo({ fechaLimite: FUTURO }, sla('atencion'), sla('atencion'), AHORA).enviar).toBeNull()
  })

  it('al 75 % avisa una sola vez', () => {
    const primero = avisoDePlazo({ fechaLimite: FUTURO }, sla('pronto'), sla('pronto'), AHORA)
    expect(primero.enviar).toEqual({ alcance: 'ticket', nivel: 'pronto' })
    const segundo = avisoDePlazo({ fechaLimite: FUTURO, avisosPlazo: primero.marcas }, sla('pronto'), sla('pronto'), AHORA)
    expect(segundo).toEqual({ marcas: {}, enviar: null })
  })

  it('sin plazo propio del área es un solo aviso', () => {
    const { marcas, enviar } = avisoDePlazo({ fechaLimite: LIMITE }, sla('vencido'), sla('vencido'), AHORA)
    expect(enviar).toEqual({ alcance: 'ticket', nivel: 'vencido' })
    expect(Object.keys(marcas).sort()).toEqual(['ticketPronto', 'ticketVencido'])
  })

  it('vencer solo el área avisa por el área', () => {
    const { enviar } = avisoDePlazo({ fechaLimite: FUTURO, fechaLimiteArea: LIMITE_AREA }, sla('ok'), sla('vencido'), AHORA)
    expect(enviar).toEqual({ alcance: 'area', nivel: 'vencido' })
  })

  it('si vencen los dos a la vez sale un solo correo, el del ticket, y marca ambos', () => {
    const { marcas, enviar } = avisoDePlazo({ fechaLimite: LIMITE, fechaLimiteArea: LIMITE_AREA }, sla('vencido'), sla('vencido'), AHORA)
    expect(enviar).toEqual({ alcance: 'ticket', nivel: 'vencido' })
    expect(Object.keys(marcas).sort()).toEqual(['areaPronto', 'areaVencido', 'ticketPronto', 'ticketVencido'])
  })

  it('vencido pesa más que por vencer', () => {
    const { enviar } = avisoDePlazo({ fechaLimite: FUTURO, fechaLimiteArea: LIMITE_AREA }, sla('pronto'), sla('vencido'), AHORA)
    expect(enviar).toEqual({ alcance: 'area', nivel: 'vencido' })
  })

  it('tras avisar el vencido no vuelve a avisar por vencer', () => {
    const avisosPlazo = { ticketPronto: LIMITE, ticketVencido: LIMITE }
    expect(avisoDePlazo({ fechaLimite: LIMITE, avisosPlazo }, sla('vencido'), sla('vencido'), AHORA)).toEqual({ marcas: {}, enviar: null })
  })

  it('si la fecha cambia, el aviso vuelve a estar disponible', () => {
    const avisosPlazo = { ticketPronto: LIMITE }
    expect(avisoDePlazo({ fechaLimite: FUTURO, avisosPlazo }, sla('pronto'), sla('pronto'), AHORA).enviar).toEqual({ alcance: 'ticket', nivel: 'pronto' })
  })

  it('un área nueva vuelve a avisar, aunque el área anterior ya hubiera avisado', () => {
    const avisosPlazo = { areaVencido: LIMITE_AREA }
    expect(avisoDePlazo({ fechaLimite: FUTURO, fechaLimiteArea: LIMITE, avisosPlazo }, sla('ok'), sla('vencido'), AHORA).enviar).toEqual({ alcance: 'area', nivel: 'vencido' })
  })

  it('vencido hace mucho se marca, pero no envía: sin avalancha de correos', () => {
    const viejo = bog('2026-11-01T09:00')
    const { marcas, enviar } = avisoDePlazo({ fechaLimite: viejo }, sla('vencido'), sla('vencido'), AHORA)
    expect(enviar).toBeNull()
    expect(marcas.ticketVencido).toEqual(viejo)
  })
})

describe('accionDePausa', () => {
  const lunes = bog('2026-10-26T09:00')
  const esperando = { estado: 'esperando_usuario', pausadoDesde: lunes }
  const resuelto = { estado: 'resuelto', pausadoDesde: lunes }

  it.each([
    ['2 días: nada', esperando, '2026-10-28T09:00', null],
    ['3 días: recuerda', esperando, '2026-10-29T09:00', 'recordar'],
    ['5 días: cierra', esperando, '2026-11-02T09:00', 'cerrar_sin_respuesta'],
    ['resuelto 2 días: nada', resuelto, '2026-10-28T09:00', null],
    ['resuelto 3 días: cierra', resuelto, '2026-10-29T09:00', 'cerrar_sin_confirmar']
  ])('%s', (_caso, ticket, ahora, esperado) => {
    expect(accionDePausa(ticket, HORARIO_POR_DEFECTO, bog(ahora))).toBe(esperado)
  })

  it('cuenta días laborales, no de calendario', () => {
    // Del viernes 09:00 al lunes 09:00 solo hay 1 día laboral
    expect(accionDePausa({ estado: 'resuelto', pausadoDesde: bog('2026-10-30T09:00') }, HORARIO_POR_DEFECTO, bog('2026-11-02T09:00'))).toBeNull()
  })

  it('el recordatorio sale una sola vez por pausa', () => {
    const ticket = { ...esperando, avisosPlazo: { recordatorio: lunes } }
    expect(accionDePausa(ticket, HORARIO_POR_DEFECTO, bog('2026-10-29T09:00'))).toBeNull()
  })

  it('una pausa nueva vuelve a recordar', () => {
    const ticket = { ...esperando, avisosPlazo: { recordatorio: bog('2026-10-01T09:00') } }
    expect(accionDePausa(ticket, HORARIO_POR_DEFECTO, bog('2026-10-29T09:00'))).toBe('recordar')
  })

  it('un ticket que no está en pausa no tiene acción', () => {
    expect(accionDePausa({ estado: 'en_progreso', pausadoDesde: null }, HORARIO_POR_DEFECTO, bog('2026-12-01T09:00'))).toBeNull()
  })
})

describe('tareasActivas', () => {
  it('solo en producción, salvo que se pida otra cosa', () => {
    expect(tareasActivas({})).toBe(false)
    expect(tareasActivas({ NODE_ENV: 'development' })).toBe(false)
    expect(tareasActivas({ NODE_ENV: 'production' })).toBe(true)
    expect(tareasActivas({ TAREAS_PROGRAMADAS: 'on' })).toBe(true)
    expect(tareasActivas({ NODE_ENV: 'production', TAREAS_PROGRAMADAS: 'off' })).toBe(false)
  })

  it('el arranque avisa si en producción quedan apagadas', () => {
    const base = { MONGODB_URI: 'x', JWT_SECRET: 'a'.repeat(64), NODE_ENV: 'production', FRONTEND_URL: 'https://x.co', EMAIL_PROVEEDOR: 'mailchimp', MAILCHIMP_API_KEY: 'k', EMAIL_REMITENTE: 'a@b.co' }
    expect(revisarEntorno(base).avisos).toEqual([])
    expect(revisarEntorno({ ...base, TAREAS_PROGRAMADAS: 'off' }).avisos[0]).toMatch(/TAREAS_PROGRAMADAS/)
  })
})
