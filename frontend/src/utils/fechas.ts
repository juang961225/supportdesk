// Fecha corta con hora en es-CO (ej. "24 oct, 3:00 p. m."), usada para fechas límite
export const formatFechaLimite = (fecha: string) =>
  new Date(fecha).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
