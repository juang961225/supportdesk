import crypto from 'crypto'
import path from 'path'
import mongoose, { Schema } from 'mongoose'
import multer from 'multer'
import { subirArchivo, urlFirmada, storageConfigurado } from './storage'

// Tipos permitidos: imágenes y documentos (decisión B4)
const MIMES_PERMITIDOS: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/csv': ['.csv'],
  'application/vnd.ms-excel': ['.csv'], // así llega un .csv desde algunos navegadores en Windows
  'text/plain': ['.txt']
}

export const MAX_ARCHIVOS = 5
export const MAX_BYTES = 10 * 1024 * 1024

export interface Adjunto {
  key: string
  nombre: string
  mime: string
  tamano: number
}

// Subdocumento compartido por Ticket.archivos y Comment.archivos
export const AdjuntoSchema = new Schema<Adjunto>(
  {
    key: { type: String, required: true },
    nombre: { type: String, required: true },
    mime: { type: String, required: true },
    tamano: { type: Number, required: true }
  },
  { _id: false }
)

// multer en memoria: valida tipo (mime + extensión), tamaño y cantidad antes de llegar al controller
export const uploadAdjuntos = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: MAX_ARCHIVOS },
  fileFilter: (_req, file, cb) => {
    const extensiones = MIMES_PERMITIDOS[file.mimetype]
    const ext = path.extname(file.originalname).toLowerCase()
    if (extensiones && extensiones.includes(ext)) {
      cb(null, true)
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname))
    }
  }
}).array('archivos', MAX_ARCHIVOS)

// multer entrega el nombre en latin1: lo pasamos a UTF-8 para conservar tildes y ñ
const nombreOriginal = (file: Express.Multer.File): string =>
  Buffer.from(file.originalname, 'latin1').toString('utf8')

// Sube los archivos del request y devuelve su metadata para guardarla en el documento
export const guardarAdjuntos = async (
  files: Express.Multer.File[],
  ticketId: mongoose.Types.ObjectId | string
): Promise<Adjunto[]> => {
  const adjuntos: Adjunto[] = []
  for (const file of files) {
    const nombre = nombreOriginal(file)
    const key = `tickets/${ticketId}/${crypto.randomUUID()}${path.extname(nombre).toLowerCase()}`
    await subirArchivo(key, file.buffer, file.mimetype)
    adjuntos.push({ key, nombre, mime: file.mimetype, tamano: file.size })
  }
  return adjuntos
}

// Agrega una URL firmada temporal a cada adjunto (las imágenes se ven en línea; el resto se descarga)
// Sin storage configurado devuelve url vacía (el frontend muestra el adjunto sin enlace)
export const firmarAdjuntos = async (adjuntos: Adjunto[] = []): Promise<(Adjunto & { url: string })[]> =>
  Promise.all(adjuntos.map(async (a) => ({
    key: a.key,
    nombre: a.nombre,
    mime: a.mime,
    tamano: a.tamano,
    url: storageConfigurado() ? await urlFirmada(a.key, a.nombre, !a.mime.startsWith('image/')) : ''
  })))
