// Fecha en hora Colombia (UTC-5): bog('2026-10-26T10:00') → lunes 26 oct, 10:00 a. m.
export const bog = (fechaHora: string): Date => new Date(`${fechaHora}-05:00`)
