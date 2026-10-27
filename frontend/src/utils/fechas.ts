// Fecha corta con hora en es-CO (ej. "24 oct, 3:00 p. m."), usada para fechas límite
export const formatFechaLimite = (fecha: string) =>
  new Date(fecha).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

const dosDigitos = (n: number): string => String(n).padStart(2, '0')

// Valor para <input type="datetime-local"> en la hora local (ej. "2026-10-27T14:30")
export const aFechaHoraLocal = (fecha: Date): string =>
  `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}` +
  `T${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`
