import { AsyncLocalStorage } from 'async_hooks'
import { Request, Response, NextFunction } from 'express'
import mongoose from 'mongoose'

// Medición de rendimiento en desarrollo (se activa desde .env, apagada por defecto):
//   LOG_PETICIONES=true → "GET /api/tickets?page=1 200 412 ms · 6 consultas" por cada petición
//   MONGO_DEBUG=true    → además imprime cada consulta a MongoDB

const contexto = new AsyncLocalStorage<{ consultas: number }>()

const medicionActiva = (): boolean => process.env.LOG_PETICIONES === 'true'

// Mongoose avisa cada consulta: se cuenta en la petición en curso (AsyncLocalStorage sigue el hilo async)
export const configurarMedicion = (): void => {
  const imprimirConsultas = process.env.MONGO_DEBUG === 'true'
  if (!medicionActiva() && !imprimirConsultas) return
  mongoose.set('debug', (coleccion: string, metodo: string) => {
    const peticion = contexto.getStore()
    if (peticion) peticion.consultas++
    if (imprimirConsultas) console.log(`   [mongo] ${coleccion}.${metodo}`)
  })
}

export const medirPeticiones = (req: Request, res: Response, next: NextFunction): void => {
  if (!medicionActiva()) {
    next()
    return
  }
  const inicio = process.hrtime.bigint()
  const peticion = { consultas: 0 }
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - inicio) / 1e6
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(0)} ms · ${peticion.consultas} consultas`)
  })
  contexto.run(peticion, next)
}
