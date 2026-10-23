// Reglas de adjuntos (mismas que el backend: backend/src/services/attachments.ts)
export const MAX_ARCHIVOS = 5
export const MAX_BYTES = 10 * 1024 * 1024
export const EXTENSIONES_PERMITIDAS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.docx', '.xlsx', '.csv', '.txt']

// Valor para el atributo accept del input de archivos
export const ACCEPT_ADJUNTOS = EXTENSIONES_PERMITIDAS.join(',')

const extensionDe = (nombre: string): string => {
  const punto = nombre.lastIndexOf('.')
  return punto >= 0 ? nombre.slice(punto).toLowerCase() : ''
}

// Devuelve el motivo por el que un archivo no se puede adjuntar, o null si es válido
export const validarArchivo = (archivo: File): string | null => {
  if (!EXTENSIONES_PERMITIDAS.includes(extensionDe(archivo.name))) {
    return `"${archivo.name}": tipo no permitido (solo imágenes, PDF, Word, Excel, CSV o TXT)`
  }
  if (archivo.size > MAX_BYTES) {
    return `"${archivo.name}": pesa más de 10 MB`
  }
  return null
}

export const formatTamano = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
