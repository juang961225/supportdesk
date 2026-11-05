import { aliasDemo, elegirSedesDemo, revisarEntornoSeed, ticketsDemo } from '../src/utils/datosDemo'
import { normalizarCatalogo } from '../src/utils/contextoUsuario'

const BASE = { MONGODB_URI: 'mongodb://x', SEED_EMAIL: 'juan@empresa.com', SEED_PASSWORD: 'clave1234' }

describe('revisarEntornoSeed', () => {
  it('con todo lo necesario se puede correr', () => {
    expect(revisarEntornoSeed(BASE)).toEqual([])
  })

  it('exige el buzón y una contraseña que cumpla la política', () => {
    expect(revisarEntornoSeed({ ...BASE, SEED_EMAIL: undefined })[0]).toMatch(/SEED_EMAIL/)
    expect(revisarEntornoSeed({ ...BASE, SEED_EMAIL: 'no-es-correo' })[0]).toMatch(/SEED_EMAIL/)
    expect(revisarEntornoSeed({ ...BASE, SEED_PASSWORD: undefined })[0]).toMatch(/SEED_PASSWORD/)
    expect(revisarEntornoSeed({ ...BASE, SEED_PASSWORD: 'corta1' })[0]).toMatch(/SEED_PASSWORD/)
    expect(revisarEntornoSeed({ ...BASE, SEED_PASSWORD: 'sinnumeros' })[0]).toMatch(/SEED_PASSWORD/)
  })

  it('en producción se niega sin el permiso explícito', () => {
    expect(revisarEntornoSeed({ ...BASE, NODE_ENV: 'production' })[0]).toMatch(/PERMITIR_SEED_DEMO/)
    expect(revisarEntornoSeed({ ...BASE, NODE_ENV: 'production', PERMITIR_SEED_DEMO: 'true' })[0]).toMatch(/PERMITIR_SEED_DEMO/)
    expect(revisarEntornoSeed({ ...BASE, NODE_ENV: 'production', PERMITIR_SEED_DEMO: 'si' })).toEqual([])
  })
})

describe('aliasDemo', () => {
  it('arma un alias del mismo buzón', () => {
    expect(aliasDemo('Juan@Gmail.com', 'admin')).toBe('juan+demo.admin@gmail.com')
  })

  it('no acumula alias si el buzón ya trae uno', () => {
    expect(aliasDemo('juan+algo@gmail.com', 'admin')).toBe('juan+demo.admin@gmail.com')
  })
})

describe('elegirSedesDemo', () => {
  const catalogo = normalizarCatalogo({
    brands: [{ id: 0, name: 'BMW' }, { id: 1, name: 'MINI' }],
    dealers: [
      { id: 1, brand_id: 0, name: 'A', enabled: true },
      { id: 2, brand_id: 0, name: 'B', enabled: true },
      { id: 3, brand_id: 0, name: 'C', enabled: true },
      { id: 4, brand_id: 1, name: 'D', enabled: true }
    ],
    importers: [{ id: 5, brand_id: 0, name: 'E', enabled: true }]
  })

  it('toma dos de BMW, uno de MINI y un importador', () => {
    const sedes = elegirSedesDemo(catalogo)
    expect(sedes.bmw).toHaveLength(2)
    expect(sedes.mini.map((s) => s.nombre)).toEqual(['D'])
    expect(sedes.importador.map((s) => s.nombre)).toEqual(['E'])
  })

  it('sin catálogo queda vacío', () => {
    expect(elegirSedesDemo({ organizaciones: [], sedes: [] })).toEqual({ bmw: [], mini: [], importador: [] })
  })
})

describe('ticketsDemo', () => {
  const tickets = ticketsDemo(24)

  it('siempre genera lo mismo', () => {
    expect(ticketsDemo(24)).toEqual(tickets)
  })

  it('cubre todos los estados y prioridades', () => {
    expect(new Set(tickets.map((t) => t.estado)).size).toBe(7)
    expect(new Set(tickets.map((t) => t.prioridad)).size).toBe(4)
  })

  it('reparte las fechas entre hoy y hace semanas', () => {
    expect(Math.min(...tickets.map((t) => t.diasAtras))).toBe(0)
    expect(Math.max(...tickets.map((t) => t.diasAtras))).toBeGreaterThan(30)
  })
})
