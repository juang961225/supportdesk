import { Request, Response, NextFunction } from 'express'
import { Error as MongooseError } from 'mongoose'

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction): void => {
  // ID de MongoDB inválido (ej. "/api/tickets/abc")
  if (err instanceof MongooseError.CastError) {
    res.status(400).json({ message: 'ID inválido' })
    return
  }

  // Clave única duplicada (email, slug, etc.)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0]
    const message = field ? `Ya existe un registro con ese ${field}` : 'Dato duplicado'
    res.status(400).json({ message })
    return
  }

  // Error de validación del schema de Mongoose
  if (err instanceof MongooseError.ValidationError) {
    const message = Object.values(err.errors)[0]?.message || 'Error de validación'
    res.status(400).json({ message })
    return
  }

  console.error(`[${req.method}] ${req.path}`, err)
  res.status(500).json({ message: 'Error interno del servidor' })
}
