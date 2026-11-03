// Verifica que el contenido real de un archivo coincida con el tipo que declara (función pura).
// La extensión y el tipo MIME los pone el cliente y se pueden falsificar (ej. un ejecutable renombrado a .pdf);
// los primeros bytes ("firma") identifican el formato de verdad.

const empiezaCon = (buffer: Buffer, firma: number[] | string, desde = 0): boolean => {
  const bytes = typeof firma === 'string' ? Buffer.from(firma, 'latin1') : Buffer.from(firma)
  return buffer.length >= desde + bytes.length && buffer.subarray(desde, desde + bytes.length).equals(bytes)
}

const ZIP = [0x50, 0x4b, 0x03, 0x04] // los .docx y .xlsx son archivos ZIP

// Firmas de formatos binarios que nunca deben pasar por texto
const BINARIOS = [ZIP, '%PDF-', [0x4d, 0x5a] /* ejecutable Windows */, [0x7f, 0x45, 0x4c, 0x46] /* ELF */, [0xff, 0xd8, 0xff], [0x89, 0x50, 0x4e, 0x47]]

// Texto plano (CSV, TXT): sin bytes nulos en el inicio y sin firma de un formato binario.
// Excepción: UTF-16 (Excel lo usa en "Texto Unicode") lleva bytes nulos, pero empieza con su marca (BOM)
const pareceTexto = (buffer: Buffer): boolean => {
  if (empiezaCon(buffer, [0xff, 0xfe]) || empiezaCon(buffer, [0xfe, 0xff])) return true
  const inicio = buffer.subarray(0, 8192)
  return !inicio.includes(0) && !BINARIOS.some((firma) => empiezaCon(buffer, firma))
}

// Office Open XML: un ZIP cuyas entradas viven en la carpeta propia del formato (word/ o xl/)
const esOffice = (buffer: Buffer, carpeta: string): boolean =>
  empiezaCon(buffer, ZIP) && buffer.includes(Buffer.from(carpeta, 'latin1'))

const VERIFICADORES: Record<string, (buffer: Buffer) => boolean> = {
  'image/jpeg': (b) => empiezaCon(b, [0xff, 0xd8, 0xff]),
  'image/png': (b) => empiezaCon(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  'image/gif': (b) => empiezaCon(b, 'GIF87a') || empiezaCon(b, 'GIF89a'),
  'image/webp': (b) => empiezaCon(b, 'RIFF') && empiezaCon(b, 'WEBP', 8),
  // Algunos PDF traen unos bytes antes de la cabecera: se busca en el primer KB
  'application/pdf': (b) => b.subarray(0, 1024).includes(Buffer.from('%PDF-', 'latin1')),
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': (b) => esOffice(b, 'word/'),
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': (b) => esOffice(b, 'xl/'),
  'text/csv': pareceTexto,
  'application/vnd.ms-excel': pareceTexto, // así llega un .csv desde algunos navegadores en Windows
  'text/plain': pareceTexto
}

// true si el contenido corresponde al tipo declarado (los tipos no permitidos ya los rechaza multer)
export const contenidoCoincide = (buffer: Buffer, mime: string): boolean => {
  if (buffer.length === 0) return false
  const verificar = VERIFICADORES[mime]
  return verificar ? verificar(buffer) : false
}
