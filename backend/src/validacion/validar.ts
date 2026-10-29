import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

// Valida el body con un esquema antes del controller: si no cumple → 400 con el primer error en español.
// Si cumple, req.body queda normalizado (textos sin espacios sobrantes, email en minúsculas, campos de más fuera).
export const validarBody = (esquema: z.ZodType) => (req: Request, res: Response, next: NextFunction): void => {
  const resultado = esquema.safeParse(req.body ?? {})
  if (!resultado.success) {
    res.status(400).json({ message: resultado.error.issues[0]?.message ?? 'Datos inválidos' })
    return
  }
  req.body = resultado.data
  next()
}
