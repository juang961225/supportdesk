import { formatTiempoLaboral } from '../src/utils/formatoTiempo'

describe('formatTiempoLaboral (días de jornada + fracción del último día)', () => {
  it.each([
    [45, 480, '45 min'],
    [320, 480, '5 h 20 min'],
    [480, 480, '1 día'],
    [1260, 480, '2 días y 5 h'],
    [1000, 480, '2 días y 40 min'],
    [960, 480, '2 días'],
    [2460, 600, '4 días y 1 h'],
    [500, 0, '8 h 20 min'] // sin jornada conocida: solo horas
  ])('%i min con jornada de %i min → "%s"', (minutos, jornada, esperado) => {
    expect(formatTiempoLaboral(minutos, jornada)).toBe(esperado)
  })
})
