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

// Suma archivos nuevos a los ya elegidos: descarta los inválidos y respeta el máximo.
// Devuelve la lista resultante y los avisos para mostrar al usuario.
export const combinarAdjuntos = (actuales: File[], nuevos: File[]): { archivos: File[]; avisos: string[] } => {
  const avisos: string[] = []
  const validos: File[] = []
  for (const archivo of nuevos) {
    const error = validarArchivo(archivo)
    if (error) avisos.push(error)
    else validos.push(archivo)
  }

  const disponibles = Math.max(MAX_ARCHIVOS - actuales.length, 0)
  if (validos.length > disponibles) {
    avisos.push(`Puedes adjuntar como máximo ${MAX_ARCHIVOS} archivos`)
  }
  return { archivos: [...actuales, ...validos.slice(0, disponibles)], avisos }
}

const dosDigitos = (n: number): string => String(n).padStart(2, '0')

// Los pantallazos pegados llegan como "image.png": les damos un nombre con fecha y hora
export const nombrarPegado = (archivo: File, fecha: Date, indice: number): File => {
  if (!/^image\.\w+$/i.test(archivo.name)) return archivo
  const ext = extensionDe(archivo.name)
  const sello = `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}` +
    `-${dosDigitos(fecha.getHours())}${dosDigitos(fecha.getMinutes())}${dosDigitos(fecha.getSeconds())}`
  const sufijo = indice > 0 ? `-${indice + 1}` : ''
  return new File([archivo], `captura-${sello}${sufijo}${ext}`, { type: archivo.type, lastModified: archivo.lastModified })
}
