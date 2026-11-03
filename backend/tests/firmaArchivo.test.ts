import ExcelJS from 'exceljs'
import { contenidoCoincide } from '../src/utils/firmaArchivo'

const MIME = {
  jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv', csvWindows: 'application/vnd.ms-excel', txt: 'text/plain'
}
const bytes = (...partes: (number[] | string)[]) =>
  Buffer.concat(partes.map((p) => (typeof p === 'string' ? Buffer.from(p, 'latin1') : Buffer.from(p))))

const PNG = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'resto')
const EXE = bytes('MZ', [0x90, 0x00, 0x03])
const DOCX = bytes([0x50, 0x4b, 0x03, 0x04], 'xxxx[Content_Types].xml', 'word/document.xml')

describe('contenidoCoincide', () => {
  it('reconoce cada formato permitido', async () => {
    const libro = new ExcelJS.Workbook()
    libro.addWorksheet('Hoja').addRow(['a', 1])
    const xlsx = Buffer.from(await libro.xlsx.writeBuffer())

    expect(contenidoCoincide(bytes([0xff, 0xd8, 0xff, 0xe0]), MIME.jpeg)).toBe(true)
    expect(contenidoCoincide(PNG, MIME.png)).toBe(true)
    expect(contenidoCoincide(bytes('GIF89a...'), MIME.gif)).toBe(true)
    expect(contenidoCoincide(bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8 '), MIME.webp)).toBe(true)
    expect(contenidoCoincide(bytes('%PDF-1.7\n...'), MIME.pdf)).toBe(true)
    expect(contenidoCoincide(bytes([0xef, 0xbb, 0xbf], '%PDF-1.4'), MIME.pdf)).toBe(true) // bytes antes de la cabecera
    expect(contenidoCoincide(DOCX, MIME.docx)).toBe(true)
    expect(contenidoCoincide(xlsx, MIME.xlsx)).toBe(true)
    expect(contenidoCoincide(bytes('nombre;email\nAna;ana@x.com\n'), MIME.csv)).toBe(true)
    expect(contenidoCoincide(bytes('nombre;año\nÑandú;2026\n'), MIME.csvWindows)).toBe(true)
    expect(contenidoCoincide(bytes([0xef, 0xbb, 0xbf], 'texto con BOM'), MIME.txt)).toBe(true)
    expect(contenidoCoincide(Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('a;b\n', 'utf16le')]), MIME.csv)).toBe(true) // UTF-16 de Excel
  })

  it('rechaza archivos disfrazados', async () => {
    const libro = new ExcelJS.Workbook()
    libro.addWorksheet('Hoja')
    const xlsx = Buffer.from(await libro.xlsx.writeBuffer())

    expect(contenidoCoincide(EXE, MIME.pdf)).toBe(false) // ejecutable renombrado a .pdf
    expect(contenidoCoincide(PNG, MIME.jpeg)).toBe(false) // PNG declarado como JPEG
    expect(contenidoCoincide(xlsx, MIME.docx)).toBe(false) // Excel declarado como Word
    expect(contenidoCoincide(bytes([0x50, 0x4b, 0x03, 0x04], 'otro.bin'), MIME.docx)).toBe(false) // ZIP cualquiera
    expect(contenidoCoincide(EXE, MIME.txt)).toBe(false) // binario como texto
    expect(contenidoCoincide(bytes('hola', [0x00], 'mundo'), MIME.csv)).toBe(false) // bytes nulos
    expect(contenidoCoincide(PNG, MIME.txt)).toBe(false)
  })

  it('archivo vacío o tipo desconocido: no coincide', () => {
    expect(contenidoCoincide(Buffer.alloc(0), MIME.txt)).toBe(false)
    expect(contenidoCoincide(PNG, 'image/svg+xml')).toBe(false)
  })
})
