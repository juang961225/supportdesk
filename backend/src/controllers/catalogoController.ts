import { Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import Ticket from '../models/Ticket'
import User from '../models/User'
import { AuthRequest } from '../middlewares/auth'
import { catalogoDeMarca } from '../services/catalogoOnlineBrief'
import { CONTEXTO_VACIO, sedesPermitidas, tieneTodas } from '../utils/contextoUsuario'

// GET /api/catalogos/contexto — opciones para asignar a un usuario (admin)
export const getCatalogoContexto = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const catalogo = await catalogoDeMarca(req.user?.marca)
    res.status(200).json(catalogo ? { disponible: true, ...catalogo } : { disponible: false, organizaciones: [], sedes: [] })
  } catch (error) {
    next(error)
  }
}

// GET /api/catalogos/mi-contexto — lo que el usuario puede elegir al crear un ticket
export const getMiContexto = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [catalogo, usuario] = await Promise.all([
      catalogoDeMarca(req.user?.marca),
      User.findById(req.user?.id).select('organizaciones sedes todosConcesionarios todosImportadores')
    ])
    if (!catalogo || !usuario || usuario.organizaciones.length === 0) {
      res.status(200).json({ aplica: false, todas: false, sedes: [] })
      return
    }
    const contexto = { ...CONTEXTO_VACIO, ...usuario.toObject() }
    res.status(200).json({ aplica: true, todas: tieneTodas(contexto), sedes: sedesPermitidas(contexto, catalogo) })
  } catch (error) {
    next(error)
  }
}

// GET /api/catalogos/filtros — organizaciones y sedes que aparecen en los tickets (filtros de la lista).
// Salen de los tickets, no del catálogo: incluyen sedes que ya no existen allá y no listan las que no tienen tickets.
export const getFiltrosContexto = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { rol, marca } = req.user!
    const filtro = rol === 'superadmin' ? {} : { marca: new mongoose.Types.ObjectId(marca) }
    const [organizaciones, sedes] = await Promise.all([
      Ticket.distinct('contexto.organizacion', filtro),
      Ticket.distinct('contexto.nombre', filtro)
    ])
    const ordenar = (valores: unknown[]): string[] =>
      valores.filter((v): v is string => typeof v === 'string').sort((a, b) => a.localeCompare(b, 'es'))
    res.status(200).json({ organizaciones: ordenar(organizaciones), sedes: ordenar(sedes) })
  } catch (error) {
    next(error)
  }
}
