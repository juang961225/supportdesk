import type { User } from '../types'

// En qué hora se ven las fechas: el equipo (admin, soporte, superadmin) trabaja en hora Colombia, sin importar
// dónde esté su dispositivo; el usuario final las ve en la zona de su dispositivo.
const ZONA_EQUIPO = 'America/Bogota'
const DESFASE_EQUIPO = '-05:00' // Colombia no tiene horario de verano
const DESFASE_EQUIPO_MS = -5 * 60 * 60 * 1000
const DIA_MS = 24 * 60 * 60 * 1000

let zonaVista: string | undefined // undefined = la del dispositivo

// Se llama al iniciar, renovar o cerrar sesión
export const fijarZonaPorRol = (rol?: User['rol']): void => {
  zonaVista = rol && rol !== 'usuario' ? ZONA_EQUIPO : undefined
}

// Fecha corta con hora en es-CO (ej. "24 oct, 3:00 p. m."), usada para fechas límite
export const formatFechaLimite = (fecha: string) =>
  new Date(fecha).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: zonaVista })

// Solo la fecha (ej. "24 oct"), para listas y tarjetas: la hora queda en el detalle
export const formatFechaCorta = (fecha: string) =>
  new Date(fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: zonaVista })

// Fecha completa con hora, para comentarios, historial y recorrido
export const formatFechaHora = (fecha: string) =>
  new Date(fecha).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: zonaVista })

const dosDigitos = (n: number): string => String(n).padStart(2, '0')

// Valor para <input type="datetime-local"> en la hora en que se ven las fechas (ej. "2026-10-27T14:30")
export const aFechaHoraVista = (fecha: Date): string => {
  if (zonaVista) return new Date(fecha.getTime() + DESFASE_EQUIPO_MS).toISOString().slice(0, 16)
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}` +
    `T${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`
}

// Lo contrario: lo que se escribió en <input type="datetime-local"> como instante real
export const deFechaHoraVista = (valor: string): Date =>
  zonaVista ? new Date(`${valor.slice(0, 16)}:00${DESFASE_EQUIPO}`) : new Date(valor)

// "2026-10-27" → inicio de ese día en la hora en que se ven las fechas (el backend compara instantes)
export const inicioDelDiaVista = (fecha: string, diasExtra = 0): string => {
  if (zonaVista) return new Date(new Date(`${fecha}T00:00:00${DESFASE_EQUIPO}`).getTime() + diasExtra * DIA_MS).toISOString()
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return new Date(anio, mes - 1, dia + diasExtra).toISOString()
}

// Duración en tiempo laboral: 45 → "45 min", 600 → "10 h", 570 → "9 h 30 min"
export const formatDuracion = (minutos: number): string => {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}
