import {
  CONTEXTO_VACIO,
  ContextoUsuario,
  ORG_LATAM,
  ORG_MEXICO,
  limpiarContexto,
  normalizarCatalogo,
  resolverContextoTicket,
  sedesPermitidas,
  subMarcaAplica,
  tieneTodas
} from '../src/utils/contextoUsuario'

const CATALOGO = normalizarCatalogo({
  organizations: [{ id: 0, name: 'MX' }, { id: 1, name: 'LATAM' }],
  brands: [{ id: 0, name: 'BMW' }, { id: 1, name: 'MINI' }],
  dealers: [
    { id: 1, brand_id: 0, name: 'Centro BMW', enabled: true },
    { id: 2, brand_id: 1, name: 'Centro MINI', enabled: true },
    { id: 3, brand_id: 0, name: 'Norte BMW', enabled: true },
    { id: 7, brand_id: 0, name: 'Activo', enabled: true },
    { id: 7, brand_id: 0, name: 'Cerrado', enabled: false }
  ],
  importers: [
    { id: 1, brand_id: 0, name: 'Bahamas', enabled: true },
    { id: 2, brand_id: 0, name: 'Aruba', enabled: false }
  ]
})

const usuario = (cambios: Partial<ContextoUsuario>): ContextoUsuario => ({ ...CONTEXTO_VACIO, ...cambios })
const MEXICO = [ORG_MEXICO]

describe('normalizarCatalogo', () => {
  it('deja solo las activas y resuelve los ids repetidos', () => {
    const claves = CATALOGO.sedes.map((s) => s.clave)
    expect(claves).toContain('c:0:7')
    expect(CATALOGO.sedes.find((s) => s.clave === 'c:0:7')?.nombre).toBe('Activo')
    expect(CATALOGO.sedes.map((s) => s.nombre)).not.toContain('Cerrado')
    expect(claves).not.toContain('i:0:2')
  })

  it('agrega el nombre de la sub-marca', () => {
    expect(CATALOGO.sedes.find((s) => s.clave === 'c:1:2')?.subMarca).toBe('MINI')
  })

  it('un archivo con otra forma no rompe', () => {
    expect(normalizarCatalogo(null)).toEqual({ organizaciones: [], sedes: [] })
    expect(normalizarCatalogo({ dealers: 'x' }).sedes).toEqual([])
  })
})

describe('sedesPermitidas', () => {
  it('devuelve solo las asignadas', () => {
    expect(sedesPermitidas(usuario({ organizaciones: MEXICO, sedes: ['c:0:1'] }), CATALOGO).map((s) => s.clave)).toEqual(['c:0:1'])
  })

  it('un corporativo ve todas las de su organización', () => {
    const sedes = sedesPermitidas(usuario({ organizaciones: MEXICO, todosConcesionarios: true }), CATALOGO)
    expect(sedes.every((s) => s.tipo === 'concesionario')).toBe(true)
    expect(sedes).toHaveLength(4)
  })

  it('sin la organización, el permiso de ver todas no aplica', () => {
    const u = usuario({ organizaciones: [ORG_LATAM], todosConcesionarios: true })
    expect(sedesPermitidas(u, CATALOGO).filter((s) => s.tipo === 'concesionario')).toEqual([])
    expect(tieneTodas(u)).toBe(false)
  })
})

describe('subMarcaAplica', () => {
  it('BMWi solo aplica a quien tiene México', () => {
    expect(subMarcaAplica(MEXICO, MEXICO)).toBe(true)
    expect(subMarcaAplica(MEXICO, [ORG_LATAM])).toBe(false)
    expect(subMarcaAplica(MEXICO, [])).toBe(false)
    expect(subMarcaAplica(MEXICO, undefined)).toBe(false)
  })

  it('sin organizaciones configuradas aplica a todos', () => {
    expect(subMarcaAplica([], [])).toBe(true)
    expect(subMarcaAplica(undefined, undefined)).toBe(true)
  })
})

describe('limpiarContexto', () => {
  it('rechaza organizaciones y sedes que no existen', () => {
    expect(limpiarContexto(usuario({ organizaciones: [9] }), CATALOGO).ok).toBe(false)
    expect(limpiarContexto(usuario({ organizaciones: MEXICO, sedes: ['c:0:999'] }), CATALOGO).ok).toBe(false)
  })

  it('descarta lo que no corresponde a sus organizaciones', () => {
    const resultado = limpiarContexto(
      usuario({ organizaciones: MEXICO, sedes: ['c:0:1', 'i:0:1'], todosConcesionarios: true, todosImportadores: true }),
      CATALOGO
    )
    expect(resultado).toEqual({
      ok: true,
      contexto: { organizaciones: MEXICO, sedes: ['c:0:1'], todosConcesionarios: true, todosImportadores: false }
    })
  })
})

describe('resolverContextoTicket', () => {
  it('sin organización el ticket no lleva contexto', () => {
    expect(resolverContextoTicket(usuario({}), undefined, 0, CATALOGO)).toEqual({ ok: true })
  })

  it('con una sola opción en esa sub-marca la toma sola', () => {
    const u = usuario({ organizaciones: MEXICO, sedes: ['c:0:1', 'c:1:2'] })
    expect(resolverContextoTicket(u, undefined, 1, CATALOGO)).toEqual({
      ok: true,
      contexto: { organizacion: 'MX', tipo: 'concesionario', clave: 'c:1:2', nombre: 'Centro MINI' }
    })
  })

  it('con varias opciones obliga a elegir', () => {
    const u = usuario({ organizaciones: MEXICO, sedes: ['c:0:1', 'c:0:3'] })
    expect(resolverContextoTicket(u, undefined, 0, CATALOGO).ok).toBe(false)
    expect(resolverContextoTicket(u, 'c:0:3', 0, CATALOGO)).toMatchObject({ ok: true, contexto: { nombre: 'Norte BMW' } })
  })

  it('no acepta una sede ajena ni de otra sub-marca', () => {
    const u = usuario({ organizaciones: MEXICO, sedes: ['c:0:1', 'c:1:2'] })
    expect(resolverContextoTicket(u, 'c:0:3', 0, CATALOGO).ok).toBe(false)
    expect(resolverContextoTicket(u, 'c:1:2', 0, CATALOGO).ok).toBe(false)
  })

  it('un corporativo queda como Corporativo si no elige, o con la sede que elija', () => {
    const u = usuario({ organizaciones: MEXICO, todosConcesionarios: true })
    expect(resolverContextoTicket(u, undefined, 0, CATALOGO)).toMatchObject({ ok: true, contexto: { nombre: 'Corporativo', organizacion: 'MX' } })
    expect(resolverContextoTicket(u, 'corporativo', 0, CATALOGO)).toMatchObject({ ok: true, contexto: { nombre: 'Corporativo' } })
    expect(resolverContextoTicket(u, 'c:0:3', 0, CATALOGO)).toMatchObject({ ok: true, contexto: { nombre: 'Norte BMW' } })
  })

  it('un corporativo de dos organizaciones no inventa la organización', () => {
    const u = usuario({ organizaciones: [ORG_MEXICO, ORG_LATAM], todosConcesionarios: true, todosImportadores: true })
    const resultado = resolverContextoTicket(u, undefined, 0, CATALOGO)
    expect(resultado).toMatchObject({ ok: true, contexto: { nombre: 'Corporativo', organizacion: undefined } })
    expect(resolverContextoTicket(u, 'i:0:1', 0, CATALOGO)).toMatchObject({ ok: true, contexto: { organizacion: 'LATAM', tipo: 'importador' } })
  })

  it('solo un corporativo puede pedir ticket general', () => {
    expect(resolverContextoTicket(usuario({ organizaciones: MEXICO, sedes: ['c:0:1'] }), 'corporativo', 0, CATALOGO).ok).toBe(false)
  })

  it('sin opciones en esa sub-marca crea el ticket solo con la organización', () => {
    const u = usuario({ organizaciones: MEXICO, sedes: ['c:0:1'] })
    expect(resolverContextoTicket(u, undefined, 1, CATALOGO)).toEqual({ ok: true, contexto: { organizacion: 'MX' } })
  })
})
