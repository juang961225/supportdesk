// Textos legibles de los valores internos (emails y reportes)

export const estadoLegible: Record<string, string> = {
  abierto: 'Abierto',
  en_progreso: 'En progreso',
  en_revision: 'En revisión',
  cerrado: 'Cerrado',
  reabierto: 'Reabierto'
}

export const prioridadLegible: Record<string, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica'
}

export const slaLegible: Record<string, string> = {
  a_tiempo: 'A tiempo',
  vencido: 'Vencido',
  en_curso: 'En curso',
  sin_fecha: 'Sin fecha límite'
}
