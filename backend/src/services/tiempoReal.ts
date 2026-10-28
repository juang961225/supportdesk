import http from 'http'
import mongoose from 'mongoose'
import { Server, Socket } from 'socket.io'
import Ticket from '../models/Ticket'
import { origenesFrontend } from '../config/origenes'
import { usuarioDesdeToken, UsuarioAutenticado } from '../middlewares/auth'
import { puedeVerTicket } from '../utils/ticketAccess'

// Tiempo real con Socket.io. Los eventos solo llevan ids: el navegador vuelve a pedir los datos
// por el API con sus permisos de siempre, así nunca viaja información a quien no la puede ver.
//
// Salas (se unen al conectar, según el usuario):
//   usuario:<id>            todos (creador, observador o asignado de un ticket)
//   rol:superadmin          el superadmin (ve todo)
//   marca:<id>:admins       los admins de la marca
//   area:<id>               los soportes de cada área
//   ticket:<id>             quien tiene abierto el detalle de ese ticket (validado con puedeVerTicket)
//
// Eventos que emite el servidor:
//   ticket:cambio     { ticketId }  cambió algo del ticket (estado, asignación, área, observadores…)
//   comentario:nuevo  { ticketId }  hay un comentario nuevo en el hilo

type Id = mongoose.Types.ObjectId | string

interface DatosSocket {
  usuario: UsuarioAutenticado
}

let io: Server | null = null

const salasDelUsuario = (usuario: UsuarioAutenticado): string[] => {
  const salas = [`usuario:${usuario.id}`]
  if (usuario.rol === 'superadmin') salas.push('rol:superadmin')
  if (usuario.rol === 'admin' && usuario.marca) salas.push(`marca:${usuario.marca}:admins`)
  if (usuario.rol === 'soporte') salas.push(...usuario.areas.map((area) => `area:${area}`))
  return salas
}

const alConectar = (socket: Socket<Record<string, never>, Record<string, never>, Record<string, never>, DatosSocket>) => {
  socket.join(salasDelUsuario(socket.data.usuario))

  // El detalle de un ticket se suscribe a su sala, solo si el usuario lo puede ver
  socket.on('ticket:seguir', async (ticketId: unknown) => {
    try {
      if (typeof ticketId !== 'string' || !mongoose.isValidObjectId(ticketId)) return
      const ticket = await Ticket.findById(ticketId).select('marca creadoPor asignadoA area observadores')
      if (ticket && puedeVerTicket(socket.data.usuario, ticket)) await socket.join(`ticket:${ticketId}`)
    } catch (error) {
      console.error('[tiempo real] Error al seguir un ticket:', error)
    }
  })

  socket.on('ticket:dejar', (ticketId: unknown) => {
    if (typeof ticketId === 'string') socket.leave(`ticket:${ticketId}`)
  })
}

export const iniciarTiempoReal = (servidor: http.Server): void => {
  io = new Server(servidor, { cors: { origin: origenesFrontend(), credentials: true } })

  // Misma autenticación que el API: access token vigente + usuario y marca activos
  io.use(async (socket, next) => {
    try {
      const token: unknown = socket.handshake.auth?.token
      const resultado = typeof token === 'string' ? await usuarioDesdeToken(token) : null
      if (!resultado?.ok) {
        next(new Error('no_autorizado')) // el navegador renueva la sesión y reconecta
        return
      }
      socket.data.usuario = resultado.usuario
      next()
    } catch (error) {
      next(error instanceof Error ? error : new Error('error'))
    }
  })

  io.on('connection', alConectar)
}

// Avisa a todos los que pueden ver el ticket (listas, dashboards y su detalle abierto).
// Se llama sin await después de guardar: nunca rompe ni demora la respuesta.
// `areasAnteriores` / `usuariosAnteriores`: quienes dejaron de estar ligados al ticket (área de origen al mover,
// soporte reasignado u observador quitado) también refrescan sus listas.
export const avisarCambioTicket = (ticketId: Id, opciones: { areasAnteriores?: Id[]; usuariosAnteriores?: Id[] } = {}): void => {
  if (!io) return
  const servidor = io
  Ticket.findById(ticketId)
    .select('marca area creadoPor asignadoA observadores')
    .lean()
    .then((ticket) => {
      if (!ticket) return
      const areas = [ticket.area, ...(opciones.areasAnteriores ?? [])].filter(Boolean)
      const usuarios = [ticket.creadoPor, ticket.asignadoA, ...(ticket.observadores ?? []), ...(opciones.usuariosAnteriores ?? [])].filter(Boolean)
      servidor
        .to([
          `ticket:${String(ticketId)}`,
          'rol:superadmin',
          `marca:${String(ticket.marca)}:admins`,
          ...areas.map((a) => `area:${String(a)}`),
          ...usuarios.map((u) => `usuario:${String(u)}`)
        ])
        .emit('ticket:cambio', { ticketId: String(ticketId) })
    })
    .catch((error) => console.error('[tiempo real] Error al avisar un cambio:', error))
}

// Comentario nuevo: solo a quien tiene abierto ese ticket (las listas no muestran comentarios)
export const avisarComentario = (ticketId: Id): void => {
  io?.to(`ticket:${String(ticketId)}`).emit('comentario:nuevo', { ticketId: String(ticketId) })
}

// Al desactivar a un usuario se cortan sus conexiones abiertas
export const desconectarUsuario = (usuarioId: Id): void => {
  io?.in(`usuario:${String(usuarioId)}`).disconnectSockets(true)
}
