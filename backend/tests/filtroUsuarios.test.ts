import { filtroDeUsuarios } from '../src/utils/filtroUsuarios'

describe('filtroDeUsuarios', () => {
  it('sin filtros no agrega nada', () => {
    expect(filtroDeUsuarios({})).toEqual({})
  })

  it('busca en nombre o correo, sin mayúsculas y con caracteres especiales escapados', () => {
    const { $or } = filtroDeUsuarios({ q: '  ana.p+1 ' }) as { $or: { nombre?: RegExp; email?: RegExp }[] }
    expect($or[0].nombre?.test('ANA.P+1 López')).toBe(true)
    expect($or[1].email?.test('anaxp1@x.co')).toBe(false)
  })

  it('rol válido sí; inválido o con objetos se ignora', () => {
    expect(filtroDeUsuarios({ rol: 'soporte' })).toEqual({ rol: 'soporte' })
    expect(filtroDeUsuarios({ rol: 'jefe' })).toEqual({})
    expect(filtroDeUsuarios({ rol: { $ne: 'x' }, q: { $gt: '' } })).toEqual({})
  })
})
