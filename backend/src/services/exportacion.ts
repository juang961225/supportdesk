import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'
import { Columna, FilaExportacion, fechaParaExcel, resumenReporte, valorParaPdf } from '../utils/exportarTickets'

// Generadores de archivos de la exportación de tickets. Reciben filas ya armadas (utils/exportarTickets).

const GRIS_ENCABEZADO = 'F3F4F6'
const ROJO_VENCIDO = 'B91C1C'

export const generarExcel = async (filas: FilaExportacion[], columnas: Columna[]): Promise<Buffer> => {
  const libro = new ExcelJS.Workbook()
  libro.creator = 'SupportDesk'
  libro.created = new Date()

  const hoja = libro.addWorksheet('Tickets', { views: [{ state: 'frozen', ySplit: 1 }] })
  hoja.columns = columnas.map((c) => ({ header: c.titulo, key: c.clave, width: c.ancho }))

  for (const fila of filas) {
    const filaHoja = hoja.addRow(Object.fromEntries(columnas.map((c) => {
      const valor = fila[c.clave]
      return [c.clave, valor instanceof Date ? fechaParaExcel(valor) : valor]
    })))
    if (fila.vencido) filaHoja.getCell('sla').font = { color: { argb: `FF${ROJO_VENCIDO}` }, bold: true }
  }

  // Encabezado en negrita con fondo gris, filtros por columna y formato de fecha
  const encabezado = hoja.getRow(1)
  encabezado.font = { bold: true }
  encabezado.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${GRIS_ENCABEZADO}` } }
  hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnas.length } }
  for (const c of columnas) {
    if (c.clave === 'creado' || c.clave === 'fechaLimite' || c.clave === 'cerrado') {
      hoja.getColumn(c.clave).numFmt = 'dd/mm/yyyy hh:mm'
    }
  }

  return Buffer.from(await libro.xlsx.writeBuffer())
}

export interface DatosPdf {
  marca: string          // "BMW" o "Todas las marcas"
  generado: string       // fecha y hora legibles
  filtros: string[]      // ["Estado: Activos", "Área: Redes"]
  filas: FilaExportacion[]
  columnas: Columna[]
}

const MARGEN = 36
const ALTO_FILA = 16
const TAMANO_TABLA = 8

export const generarPdf = (datos: DatosPdf): Promise<Buffer> =>
  new Promise((resolver, rechazar) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: MARGEN,
      bufferPages: true, // para numerar las páginas al final
      info: { Title: 'Reporte de tickets', Author: 'SupportDesk' }
    })
    const partes: Buffer[] = []
    doc.on('data', (parte: Buffer) => partes.push(parte))
    doc.on('end', () => resolver(Buffer.concat(partes)))
    doc.on('error', rechazar)

    const anchoUtil = doc.page.width - MARGEN * 2
    const totalProporcion = datos.columnas.reduce((suma, c) => suma + c.ancho, 0)
    const anchos = datos.columnas.map((c) => (c.ancho / totalProporcion) * anchoUtil)
    const limiteInferior = () => doc.page.height - MARGEN - ALTO_FILA

    // Encabezado del reporte
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#111827').text('Reporte de tickets')
    doc.font('Helvetica').fontSize(9).fillColor('#6b7280')
      .text(`${datos.marca} · Generado el ${datos.generado} (hora Colombia)`)
      .text(datos.filtros.length ? `Filtros: ${datos.filtros.join(' · ')}` : 'Sin filtros: todos los tickets')
    doc.moveDown(0.6)

    // Resumen
    const resumen = resumenReporte(datos.filas)
    const porEstado = resumen.porEstado.map((e) => `${e.estado}: ${e.total}`).join(' · ')
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827')
      .text(`Total: ${resumen.total} tickets${porEstado ? `  ·  ${porEstado}` : ''}  ·  SLA vencido: ${resumen.vencidos}`)
    doc.moveDown(0.8)

    // Tabla (el encabezado se repite en cada página)
    const dibujarCelda = (texto: string, x: number, y: number, ancho: number, color = '#111827') => {
      doc.fillColor(color).text(texto, x + 3, y + 4, { width: ancho - 6, height: TAMANO_TABLA + 2, ellipsis: true })
    }

    const dibujarEncabezado = (y: number) => {
      doc.rect(MARGEN, y, anchoUtil, ALTO_FILA).fill(`#${GRIS_ENCABEZADO}`)
      doc.font('Helvetica-Bold').fontSize(TAMANO_TABLA)
      let x = MARGEN
      datos.columnas.forEach((c, i) => {
        dibujarCelda(c.titulo, x, y, anchos[i], '#374151')
        x += anchos[i]
      })
      return y + ALTO_FILA
    }

    let y = dibujarEncabezado(doc.y)
    if (datos.filas.length === 0) {
      doc.font('Helvetica').fontSize(9).fillColor('#6b7280').text('No hay tickets con estos filtros.', MARGEN, y + 8)
    }

    datos.filas.forEach((fila, indice) => {
      if (y > limiteInferior()) {
        doc.addPage()
        y = dibujarEncabezado(MARGEN)
      }
      if (indice % 2 === 1) doc.rect(MARGEN, y, anchoUtil, ALTO_FILA).fill('#f9fafb')
      doc.font('Helvetica').fontSize(TAMANO_TABLA)
      let x = MARGEN
      datos.columnas.forEach((c, i) => {
        const vencido = c.clave === 'sla' && fila.vencido
        if (vencido) doc.font('Helvetica-Bold')
        dibujarCelda(valorParaPdf(fila, c.clave), x, y, anchos[i], vencido ? `#${ROJO_VENCIDO}` : '#111827')
        if (vencido) doc.font('Helvetica')
        x += anchos[i]
      })
      y += ALTO_FILA
    })

    // Numeración "Página n de N" (sin margen inferior, para no crear páginas nuevas)
    const rango = doc.bufferedPageRange()
    for (let i = 0; i < rango.count; i++) {
      doc.switchToPage(rango.start + i)
      const margenOriginal = doc.page.margins.bottom
      doc.page.margins.bottom = 0
      doc.font('Helvetica').fontSize(8).fillColor('#9ca3af')
        .text(`Página ${i + 1} de ${rango.count}`, MARGEN, doc.page.height - MARGEN / 2 - 4, { width: anchoUtil, align: 'right' })
      doc.page.margins.bottom = margenOriginal
    }

    doc.end()
  })
