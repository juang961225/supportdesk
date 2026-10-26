import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Almacenamiento S3-compatible (Cloudflare R2 o AWS S3). Bucket PRIVADO:
// los archivos solo se leen con URLs firmadas que entrega el backend a quien puede ver el ticket.
//
// Variables en .env:
//   STORAGE_BUCKET, STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY
//   STORAGE_REGION   — "auto" en R2, la región en S3 (ej. us-east-1)
//   STORAGE_ENDPOINT — solo R2: https://<account_id>.r2.cloudflarestorage.com
//   STORAGE_PREFIX   — opcional: carpeta propia dentro de un bucket compartido (ej. supportdesk/)

const URL_FIRMADA_SEGUNDOS = 10 * 60

let client: S3Client | null = null

export const storageConfigurado = (): boolean =>
  Boolean(process.env.STORAGE_BUCKET && process.env.STORAGE_ACCESS_KEY_ID && process.env.STORAGE_SECRET_ACCESS_KEY)

// Prefijo de las keys nuevas, siempre terminado en "/" (o vacío). Las keys guardadas lo incluyen,
// así que cambiarlo no rompe los archivos ya subidos.
export const prefijoStorage = (): string => {
  const prefijo = (process.env.STORAGE_PREFIX ?? '').trim().replace(/^\/+|\/+$/g, '')
  return prefijo ? `${prefijo}/` : ''
}

const getClient = (): S3Client => {
  if (!client) {
    client = new S3Client({
      region: process.env.STORAGE_REGION || 'auto',
      endpoint: process.env.STORAGE_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY as string
      }
    })
  }
  return client
}

export const subirArchivo = async (key: string, contenido: Buffer, mime: string): Promise<void> => {
  await getClient().send(new PutObjectCommand({
    Bucket: process.env.STORAGE_BUCKET,
    Key: key,
    Body: contenido,
    ContentType: mime
  }))
}

// URL temporal de lectura. `descarga` fuerza la descarga con el nombre original (documentos)
export const urlFirmada = (key: string, nombre: string, descarga: boolean): Promise<string> =>
  getSignedUrl(
    getClient(),
    new GetObjectCommand({
      Bucket: process.env.STORAGE_BUCKET,
      Key: key,
      ResponseContentDisposition: `${descarga ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(nombre)}`
    }),
    { expiresIn: URL_FIRMADA_SEGUNDOS }
  )
