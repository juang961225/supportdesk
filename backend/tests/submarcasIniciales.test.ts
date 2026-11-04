import { submarcasIniciales } from '../src/utils/submarcasIniciales'

describe('submarcasIniciales', () => {
  it('BMW arranca con sus 4 sub-marcas y BMW como la de por defecto', () => {
    const iniciales = submarcasIniciales(' bmw ')
    expect(iniciales.map((s) => s.nombre)).toEqual(['BMW', 'MINI', 'BMW Motorrad', 'BMWi'])
    expect(iniciales.map((s) => s.onlineBriefId)).toEqual([0, 1, 2, 3])
  })

  it('las demás marcas arrancan con "General"', () => {
    expect(submarcasIniciales('BAT')).toEqual([{ nombre: 'General' }])
  })
})
