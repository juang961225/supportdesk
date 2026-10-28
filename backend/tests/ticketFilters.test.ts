import { leerFiltrosTicket } from '../src/utils/ticketFilters'

const ID = '64b7f0c2a1b2c3d4e5f60718'

describe('leerFiltrosTicket', () => {
  it('sin filtros no agrega condiciones', () => {
    expect(leerFiltrosTicket({})).toEqual([])
  })

  it('búsqueda: parcial, sin mayúsculas, en título o descripción y con caracteres especiales escapados', () => {
    const [condicion] = leerFiltrosTicket({ q: '  impres(ora  ' })
    const { $or } = condicion as { $or: { titulo?: RegExp; descripcion?: RegExp }[] }
    const re = $or[0].titulo as RegExp
    expect(re.flags).toBe('i')
    expect(re.test('Mi IMPRES(ORA no imprime')).toBe(true)
    expect(re.test('impresora')).toBe(false) // el paréntesis es literal, no un grupo
    expect($or[1].descripcion).toEqual(re)
  })

  it('la búsqueda se limita a 100 caracteres', () => {
    const [condicion] = leerFiltrosTicket({ q: 'a'.repeat(150) })
    const re = (condicion as { $or: { titulo: RegExp }[] }).$or[0].titulo
    expect(re.source).toHaveLength(100)
  })

  it('estado, "activos" y prioridad válidos', () => {
    expect(leerFiltrosTicket({ estado: 'en_revision', prioridad: 'alta' })).toEqual([{ estado: 'en_revision' }, { prioridad: 'alta' }])
    expect(leerFiltrosTicket({ estado: 'activos' })).toEqual([{ estado: { $ne: 'cerrado' } }])
  })

  it('área, asignado, marca y "sin asignar"', () => {
    const condiciones = leerFiltrosTicket({ area: ID, asignado: ID, marca: ID })
    expect(condiciones.map((c) => Object.keys(c)[0])).toEqual(['area', 'asignadoA', 'marca'])
    expect(String((condiciones[0] as { area: unknown }).area)).toBe(ID)
    expect(leerFiltrosTicket({ asignado: 'sin_asignar' })).toEqual([{ asignadoA: null }])
  })

  it('fechas: desde inclusivo y hasta exclusivo', () => {
    const desde = '2026-10-27T05:00:00.000Z'
    const hasta = '2026-10-28T05:00:00.000Z'
    expect(leerFiltrosTicket({ desde, hasta })).toEqual([
      { createdAt: { $gte: new Date(desde) } },
      { createdAt: { $lt: new Date(hasta) } }
    ])
  })

  describe('vencimiento (relativo a ahora, sin cerrados)', () => {
    beforeAll(() => {
      jest.useFakeTimers({ now: new Date('2026-10-27T15:00:00.000Z') })
    })
    afterAll(() => {
      jest.useRealTimers()
    })

    it('vencidos', () => {
      expect(leerFiltrosTicket({ vencimiento: 'vencidos' })).toEqual([
        { estado: { $ne: 'cerrado' }, fechaLimite: { $lt: new Date('2026-10-27T15:00:00.000Z') } }
      ])
    })

    it('vencen en 24 h', () => {
      expect(leerFiltrosTicket({ vencimiento: 'pronto' })).toEqual([
        {
          estado: { $ne: 'cerrado' },
          fechaLimite: { $gte: new Date('2026-10-27T15:00:00.000Z'), $lte: new Date('2026-10-28T15:00:00.000Z') }
        }
      ])
    })
  })

  it('ignora valores inválidos', () => {
    expect(leerFiltrosTicket({
      estado: 'hackeado', prioridad: 'x', area: 'no-es-id', asignado: 'tampoco', desde: 'basura', vencimiento: 'mañana'
    })).toEqual([])
  })

  it('ignora intentos de inyección con objetos o arreglos', () => {
    expect(leerFiltrosTicket({ q: { $ne: 1 }, estado: { $ne: 'cerrado' }, marca: [ID], area: { $gt: '' } })).toEqual([])
  })
})
