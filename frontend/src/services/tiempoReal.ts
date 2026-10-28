import { io } from 'socket.io-client'
import { obtenerAccessToken, renovarSesion } from './api'

// Conexión de tiempo real (Socket.io). Una sola por pestaña, ligada a la sesión: AuthContext la abre al
// iniciar sesión y la cierra al salir. Los eventos solo traen ids; cada pantalla vuelve a pedir sus datos.

export interface EventoTicket {
  ticketId: string
}

// El servidor de sockets es el mismo del API, sin el /api
const urlServidor = new URL(import.meta.env.VITE_API_URL, window.location.origin).origin

export const socket = io(urlServidor, {
  autoConnect: false,
  withCredentials: true,
  // Se lee en cada (re)conexión: así usa siempre el access token vigente
  auth: (cb) => cb({ token: obtenerAccessToken() }),
})

// Token vencido: renovar la sesión y reconectar (si la sesión ya no sirve, el API manda al login)
socket.on('connect_error', async (error) => {
  if (error.message !== 'no_autorizado') return
  try {
    await renovarSesion()
    socket.connect()
  } catch {
    // sin sesión: no se reintenta
  }
})

export const conectarTiempoReal = (): void => {
  if (!socket.connected) socket.connect()
}

export const desconectarTiempoReal = (): void => {
  socket.disconnect()
}

// Varias partes de una pantalla pueden seguir el mismo ticket: se cuenta para salir solo con la última
const seguidores = new Map<string, number>()

const unirseASala = (ticketId: string) => socket.emit('ticket:seguir', ticketId)

// Al reconectar el servidor olvida las salas: se vuelve a pedir cada ticket seguido
socket.on('connect', () => {
  seguidores.forEach((_cantidad, ticketId) => unirseASala(ticketId))
})

export const seguirTicket = (ticketId: string): (() => void) => {
  const cantidad = seguidores.get(ticketId) ?? 0
  seguidores.set(ticketId, cantidad + 1)
  if (cantidad === 0 && socket.connected) unirseASala(ticketId)

  return () => {
    const restantes = (seguidores.get(ticketId) ?? 1) - 1
    if (restantes > 0) {
      seguidores.set(ticketId, restantes)
      return
    }
    seguidores.delete(ticketId)
    if (socket.connected) socket.emit('ticket:dejar', ticketId)
  }
}
