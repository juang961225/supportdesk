import { revisarEntorno } from '../src/config/entorno'

const SECRETO_FUERTE = 'a'.repeat(64)

describe('revisarEntorno', () => {
  it('con lo mínimo en desarrollo no hay errores', () => {
    expect(revisarEntorno({ MONGODB_URI: 'mongodb://x', JWT_SECRET: SECRETO_FUERTE })).toEqual({ errores: [], avisos: [] })
  })

  it('sin MONGODB_URI o JWT_SECRET no arranca', () => {
    const { errores } = revisarEntorno({})
    expect(errores).toEqual(expect.arrayContaining(['Falta MONGODB_URI', 'Falta JWT_SECRET']))
  })

  it('secreto corto: aviso en desarrollo, error en producción', () => {
    const base = { MONGODB_URI: 'mongodb://x', JWT_SECRET: 'supersecretkey123', FRONTEND_URL: 'https://app.empresa.com' }
    expect(revisarEntorno(base).errores).toEqual([])
    expect(revisarEntorno(base).avisos[0]).toMatch(/demasiado corto/)
    expect(revisarEntorno({ ...base, NODE_ENV: 'production' }).errores[0]).toMatch(/demasiado corto/)
  })

  it('en producción exige FRONTEND_URL', () => {
    const { errores } = revisarEntorno({ MONGODB_URI: 'mongodb://x', JWT_SECRET: SECRETO_FUERTE, NODE_ENV: 'production' })
    expect(errores[0]).toMatch(/FRONTEND_URL/)
  })

  it('avisa si SameSite=none se usa con un origen http', () => {
    const { avisos } = revisarEntorno({
      MONGODB_URI: 'mongodb://x', JWT_SECRET: SECRETO_FUERTE, NODE_ENV: 'production', COOKIE_SAMESITE: 'none', FRONTEND_URL: 'http://app.empresa.com'
    })
    expect(avisos[0]).toMatch(/HTTPS/)
  })
})
