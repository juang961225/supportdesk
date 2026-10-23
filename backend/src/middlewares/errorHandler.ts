import { Request, Response, NextFunction } from 'express'
import { Error as MongooseError } from 'mongoose'
import multer from 'multer'

export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
  // Adjuntos rechazados por multer (tamaño, cantidad o tipo)
  if (err instanceof multer.MulterError) {
    const mensajes: Partial<Record<multer.ErrorCode, string>> = {
      LIMIT_FILE_SIZE: 'Cada archivo puede pesar como máximo 10 MB',
      LIMIT_FILE_COUNT: 'Puedes adjuntar como máximo 5 archivos',
      LIMIT_UNEXPECTED_FILE: 'Tipo de archivo no permitido: solo imágenes, PDF, Word, Excel, CSV o TXT'
    }
    res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: mensajes[err.code] || 'Error al subir los archivos' })
    return
  }

  // ID de MongoDB inválido (ej. "/api/tickets/abc")
  if (err instanceof MongooseError.CastError) {
    res.status(400).json({ message: 'ID inválido' })
    return
  }

  // Clave única duplicada (email, slug, etc.)
  if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === 11000) {
    const keyValue = (err as { keyValue?: Record<string, unknown> }).keyValue
    const field = Object.keys(keyValue || {})[0]
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
