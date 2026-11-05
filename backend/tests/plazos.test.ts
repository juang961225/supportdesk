import { calcularFechaLimite, PLAZOS_POR_DEFECTO, Plazos, resolverPlazos } from '../src/utils/fechaLimite'
import { HORARIO_POR_DEFECTO } from '../src/utils/horarioLaboral'
import { esquemaAjustePlazos, esquemaPlazos } from '../src/validacion/esquemas'

const bog = (fecha: string): Date => new Date(`${fecha}:00-05:00`)
const HORAS = (valor: number) => ({ valor, unidad: 'horas' as const })
const DIAS = (valor: number) => ({ valor, unidad: 'dias' as const })

describe('resolverPlazos', () => {
  it('sin configuración usa los valores de siempre', () => {
    expect(resolverPlazos()).toEqual(PLAZOS_POR_DEFECTO)
    expect(resolverPlazos(null, null)).toEqual(PLAZOS_POR_DEFECTO)
  })

  it('la marca reemplaza los valores por defecto', () => {
    const plazos = resolverPlazos({ critica: HORAS(2) })
    expect(plazos.critica).toEqual(HORAS(2))
    expect(plazos.alta).toEqual(PLAZOS_POR_DEFECTO.alta)
  })

  it('el área manda solo en lo que ajusta; lo demás viene de la marca', () => {
    const plazos = resolverPlazos({ alta: DIAS(2), media: DIAS(4) }, { alta: HORAS(6) })
    expect(plazos.alta).toEqual(HORAS(6))
    expect(plazos.media).toEqual(DIAS(4))
    expect(plazos.baja).toEqual(PLAZOS_POR_DEFECTO.baja)
  })

  it('un ajuste vacío no reemplaza', () => {
    expect(resolverPlazos({ alta: DIAS(2) }, { alta: null }).alta).toEqual(DIAS(2))
  })
})

describe('calcularFechaLimite con plazos configurados', () => {
  const plazos: Plazos = { ...PLAZOS_POR_DEFECTO, critica: HORAS(1), alta: DIAS(2) }
  const lunes = bog('2026-11-02T09:00')

  it('cuenta las horas del plazo configurado', () => {
    expect(calcularFechaLimite('critica', HORARIO_POR_DEFECTO, lunes, plazos)).toEqual(bog('2026-11-02T10:00'))
  })

  it('un día es una jornada del horario de la marca', () => {
    expect(calcularFechaLimite('alta', HORARIO_POR_DEFECTO, lunes, plazos)).toEqual(bog('2026-11-04T09:00'))
  })

  it('sin plazos da el mismo resultado de antes', () => {
    expect(calcularFechaLimite('critica', HORARIO_POR_DEFECTO, lunes)).toEqual(bog('2026-11-02T13:00'))
  })
})

describe('validación de plazos', () => {
  const completo = { critica: HORAS(4), alta: DIAS(1), media: DIAS(3), baja: DIAS(5) }

  it('la marca debe definir las cuatro prioridades', () => {
    expect(esquemaPlazos.safeParse(completo).success).toBe(true)
    expect(esquemaPlazos.safeParse({ critica: HORAS(4) }).success).toBe(false)
  })

  it('el área puede ajustar solo algunas', () => {
    expect(esquemaAjustePlazos.safeParse({ alta: HORAS(6) }).success).toBe(true)
    expect(esquemaAjustePlazos.safeParse({}).success).toBe(true)
  })

  it('rechaza valores que no sirven', () => {
    expect(esquemaAjustePlazos.safeParse({ alta: HORAS(0) }).success).toBe(false)
    expect(esquemaAjustePlazos.safeParse({ alta: HORAS(1.5) }).success).toBe(false)
    expect(esquemaAjustePlazos.safeParse({ alta: { valor: 1, unidad: 'semanas' } }).success).toBe(false)
    expect(esquemaAjustePlazos.safeParse({ alta: { valor: '1', unidad: 'dias' } }).success).toBe(false)
  })
})
