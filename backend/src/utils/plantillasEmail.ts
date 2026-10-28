// Plantillas de los emails de notificación (funciones puras: no saben de proveedores ni de la BD)

export interface DatosPlantilla {
  resumen: string      // qué pasó, ej. "Ana comentó en el ticket"
  ticketTitulo: string
  detalle?: string     // línea secundaria, ej. "Área: Redes · Prioridad: Alta"
  extracto?: string    // texto del comentario o la descripción (se recorta)
  enlace: string
}

export interface ContenidoEmail {
  html: string
  texto: string
}

const MAX_EXTRACTO = 300

export { estadoLegible, prioridadLegible } from './etiquetas'

// Todo lo que viene de usuarios (títulos, comentarios, nombres) se escapa antes de ir al HTML
const escaparHtml = (texto: string): string =>
  texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const recortar = (texto: string, max = MAX_EXTRACTO): string => {
  const limpio = texto.trim().replace(/\s+/g, ' ')
  return limpio.length > max ? `${limpio.slice(0, max - 1).trimEnd()}…` : limpio
}

export const plantillaTicket = (datos: DatosPlantilla): ContenidoEmail => {
  const extracto = datos.extracto ? recortar(datos.extracto) : ''

  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1f2937">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px">
    <tr><td style="padding:24px">
      <p style="margin:0 0 16px;font-size:13px;font-weight:600;color:#2563eb">SupportDesk</p>
      <p style="margin:0 0 8px;font-size:15px">${escaparHtml(datos.resumen)}</p>
      <p style="margin:0 0 4px;font-size:18px;font-weight:600">${escaparHtml(datos.ticketTitulo)}</p>
      ${datos.detalle ? `<p style="margin:0 0 16px;font-size:13px;color:#6b7280">${escaparHtml(datos.detalle)}</p>` : ''}
      ${extracto ? `<blockquote style="margin:16px 0;padding:12px 16px;background:#f9fafb;border-left:3px solid #d1d5db;font-size:14px;color:#374151">${escaparHtml(extracto)}</blockquote>` : ''}
      <a href="${escaparHtml(datos.enlace)}" style="display:inline-block;margin-top:8px;padding:10px 18px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px">Ver ticket</a>
      <p style="margin:24px 0 0;font-size:12px;color:#9ca3af">Recibes este aviso porque participas en este ticket.</p>
    </td></tr>
  </table>
</body>
</html>`

  const texto = [
    datos.resumen,
    '',
    datos.ticketTitulo,
    datos.detalle ?? '',
    extracto ? `\n"${extracto}"\n` : '',
    `Ver ticket: ${datos.enlace}`
  ].filter((linea, i, lineas) => linea !== '' || lineas[i - 1] !== '').join('\n')

  return { html, texto }
}
