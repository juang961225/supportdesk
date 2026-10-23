import mongoose from 'mongoose'
import { AuthRequest } from '../middlewares/auth'

type AuthUser = NonNullable<AuthRequest['user']>

// Una referencia puede venir como ObjectId o poblada ({ _id, ... })
type Ref = mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId } | null | undefined

interface TicketAccessFields {
  marca: Ref
  creadoPor: Ref
  asignadoA?: Ref
  area?: Ref
}

const idDe = (ref: Ref): string | undefined => {
  if (!ref) return undefined
  return ref instanceof mongoose.Types.ObjectId ? String(ref) : String(ref._id)
}

// Única regla de "quién puede ver un ticket" (y por tanto leer y escribir en su hilo)
export const puedeVerTicket = (user: AuthUser, ticket: TicketAccessFields): boolean => {
  switch (user.rol) {
    case 'superadmin':
      return true
    case 'admin':
      return idDe(ticket.marca) === String(user.marca)
    case 'soporte': {
      // Ve los tickets de sus áreas (cola, suyos y de compañeros) y los asignados a él
      const area = idDe(ticket.area)
      return (area !== undefined && user.areas.includes(area)) || idDe(ticket.asignadoA) === user.id
    }
    case 'usuario':
      return idDe(ticket.creadoPor) === user.id
    default:
      return false
  }
}
