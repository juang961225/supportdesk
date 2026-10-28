import { Response, NextFunction } from 'express'
import Brand from '../models/Brand'
import { AuthRequest } from '../middlewares/auth'
import { horarioDeMarca, invalidarHorario } from '../services/horario'
import { invalidarResumenesDeMarca } from '../services/cacheResumenes'
import { validarHorario } from '../utils/horarioLaboral'

// GET /api/horario — horario laboral de la marca del admin
export const getHorario = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(200).json({ horario: await horarioDeMarca(req.user!.marca as string) })
  } catch (error) {
    next(error)
  }
}

// PUT /api/horario — el admin ajusta días, horas y festivos de su marca.
// Aplica a las fechas límite que se calculen desde ahora; las existentes no cambian.
export const updateHorario = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const horario = validarHorario(req.body)
    if (typeof horario === 'string') {
      res.status(400).json({ message: horario })
      return
    }

    const marca = await Brand.findByIdAndUpdate(req.user!.marca, { horario }, { returnDocument: 'after', runValidators: true })
    invalidarHorario(String(req.user!.marca))
    invalidarResumenesDeMarca(String(req.user!.marca)) // el SLA de las tendencias depende del horario
    if (!marca) {
      res.status(404).json({ message: 'Marca no encontrada' })
      return
    }

    res.status(200).json({ message: 'Horario actualizado', horario })
  } catch (error) {
    next(error)
  }
}
