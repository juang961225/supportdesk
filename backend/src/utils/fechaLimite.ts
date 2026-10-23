// Calcula la fecha límite según la prioridad
export const calcularFechaLimite = (prioridad: string): Date => {
  const ahora = new Date()
  const horas: Record<string, number> = {
    critica: 4,
    alta: 24,
    media: 72,
    baja: 168
  }
  ahora.setHours(ahora.getHours() + (horas[prioridad] || 72))
  return ahora
}
