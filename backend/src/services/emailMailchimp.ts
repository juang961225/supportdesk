import type { EmailSaliente, ProveedorEmail } from './email'

// Adaptador de Mailchimp Transactional. Se llama al API con fetch, sin el SDK oficial: el SDK devuelve
// los errores de red como un valor en vez de lanzarlos, y solo agregaría axios como dependencia.
//
// Variables en .env: MAILCHIMP_API_KEY (la del producto Transactional, no la de Mailchimp Marketing)

const URL_ENVIO = 'https://mandrillapp.com/api/1.3/messages/send'
const TIEMPO_MAXIMO_MS = 10_000
const ESTADOS_ACEPTADOS = ['sent', 'queued', 'scheduled']

interface Remitente {
  nombre?: string
  email: string
}

// "SupportDesk <soporte@empresa.com>" → nombre y email; "soporte@empresa.com" → solo email
export const separarRemitente = (remitente: string): Remitente => {
  const partes = remitente.match(/^\s*"?(.*?)"?\s*<([^<>\s]+)>\s*$/)
  if (!partes) return { email: remitente.trim() }
  return partes[1] ? { nombre: partes[1], email: partes[2] } : { email: partes[2] }
}

export const armarMensaje = (email: EmailSaliente, remitente: string) => {
  const { nombre, email: emailRemitente } = separarRemitente(remitente)
  return {
    from_email: emailRemitente,
    ...(nombre ? { from_name: nombre } : {}),
    subject: email.asunto,
    html: email.html,
    text: email.texto,
    to: [{ email: email.para.email, name: email.para.nombre, type: 'to' }],
    // Los enlaces de "Ver ticket" van directo a la app, sin pasar por el rastreo de Mailchimp
    track_opens: false,
    track_clicks: false
  }
}

const esObjeto = (valor: unknown): valor is Record<string, unknown> => typeof valor === 'object' && valor !== null

// Mailchimp responde 200 aunque rechace el correo: el resultado real viene por destinatario
export const revisarRespuesta = (status: number, cuerpo: unknown): void => {
  if (status < 200 || status >= 300) {
    const detalle = esObjeto(cuerpo) ? [cuerpo.name, cuerpo.message].filter(Boolean).join(': ') : ''
    throw new Error(`Mailchimp respondió ${status}${detalle ? ` (${detalle})` : ''}`)
  }
  const resultado: unknown = Array.isArray(cuerpo) ? cuerpo[0] : undefined
  if (!esObjeto(resultado) || typeof resultado.status !== 'string') {
    throw new Error('Mailchimp devolvió una respuesta inesperada')
  }
  if (!ESTADOS_ACEPTADOS.includes(resultado.status)) {
    const motivo = typeof resultado.reject_reason === 'string' ? `: ${resultado.reject_reason}` : ''
    throw new Error(`Mailchimp no aceptó el correo (${resultado.status}${motivo})`)
  }
}

export const proveedorMailchimp: ProveedorEmail = {
  enviar: async (email, remitente) => {
    const key = process.env.MAILCHIMP_API_KEY
    if (!key) throw new Error('Falta MAILCHIMP_API_KEY')

    const respuesta = await fetch(URL_ENVIO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, message: armarMensaje(email, remitente) }),
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS)
    })
    const cuerpo: unknown = await respuesta.json().catch(() => null)
    revisarRespuesta(respuesta.status, cuerpo)
  }
}
