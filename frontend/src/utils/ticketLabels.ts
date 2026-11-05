import type { Ticket } from '../types'

// Etiquetas legibles para los estados (en_progreso → "En progreso")
export const estadoLabel: Record<Ticket['estado'], string> = {
  abierto: 'Abierto',
  en_progreso: 'En progreso',
  en_revision: 'En revisión',
  esperando_usuario: 'Esperando al usuario',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
  reabierto: 'Reabierto',
}

// El usuario final lee los estados desde su lado: lo que le toca hacer queda claro
export const estadoLabelUsuario: Record<Ticket['estado'], string> = {
  ...estadoLabel,
  esperando_usuario: 'Esperando tu respuesta',
  resuelto: 'Resuelto: por confirmar',
}

// Para valores que llegan como string sin tipar (ej. eventos del historial)
export const labelDeEstado = (estado: string | undefined): string =>
  estado && estado in estadoLabel ? estadoLabel[estado as Ticket['estado']] : estado ?? ''

// Etiquetas legibles para las prioridades (critica → "Crítica")
export const prioridadLabel: Record<Ticket['prioridad'], string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
}

// Ayuda a elegir bien: de esto depende cuánto tiempo hay para resolver el ticket
export const DESCRIPCION_PRIORIDAD: Record<Ticket['prioridad'], string> = {
  critica: 'El servicio está detenido y nadie puede trabajar.',
  alta: 'Afecta a varias personas o a un proceso importante, sin alternativa.',
  media: 'Afecta el trabajo, pero hay una forma de seguir.',
  baja: 'Consulta, solicitud o mejora; no impide trabajar.',
}
