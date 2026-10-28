import { leerCookie, opcionesCookieRefresh, RUTA_COOKIE_REFRESH } from '../src/utils/cookies'

describe('leerCookie', () => {
  it('encuentra la cookie entre varias', () => {
    expect(leerCookie('tema=oscuro; sd_refresh=abc123; otra=1', 'sd_refresh')).toBe('abc123')
  })

  it('decodifica valores codificados y conserva los "=" del valor', () => {
    expect(leerCookie('sd_refresh=a%2Bb%3D%3D', 'sd_refresh')).toBe('a+b==')
    expect(leerCookie('sd_refresh=abc==', 'sd_refresh')).toBe('abc==')
  })

  it('no confunde nombres parecidos', () => {
    expect(leerCookie('x_sd_refresh=1; sd_refresh_old=2', 'sd_refresh')).toBeNull()
  })

  it('sin header o sin la cookie devuelve null', () => {
    expect(leerCookie(undefined, 'sd_refresh')).toBeNull()
    expect(leerCookie('', 'sd_refresh')).toBeNull()
    expect(leerCookie('tema=oscuro', 'sd_refresh')).toBeNull()
  })
})

describe('opcionesCookieRefresh', () => {
  const MAX_AGE = 1000

  it('por defecto (local): httpOnly, lax, sin Secure y solo para /api/auth', () => {
    expect(opcionesCookieRefresh({}, MAX_AGE)).toEqual({
      httpOnly: true, secure: false, sameSite: 'lax', path: RUTA_COOKIE_REFRESH, maxAge: MAX_AGE
    })
  })

  it('SameSite=none siempre va con Secure (el navegador lo exige)', () => {
    expect(opcionesCookieRefresh({ COOKIE_SAMESITE: 'none' }, MAX_AGE)).toMatchObject({ sameSite: 'none', secure: true })
  })

  it('en producción va con Secure', () => {
    expect(opcionesCookieRefresh({ NODE_ENV: 'production' }, MAX_AGE).secure).toBe(true)
    expect(opcionesCookieRefresh({ COOKIE_SECURE: 'true' }, MAX_AGE).secure).toBe(true)
  })

  it('un valor desconocido de SameSite cae a lax', () => {
    expect(opcionesCookieRefresh({ COOKIE_SAMESITE: 'cualquiera' }, MAX_AGE).sameSite).toBe('lax')
    expect(opcionesCookieRefresh({ COOKIE_SAMESITE: 'Strict' }, MAX_AGE).sameSite).toBe('strict')
  })
})
