import { origenesFrontend } from '../config/origenes'
import { proveedorMailchimp } from './emailMailchimp'

// Envío de emails independiente del proveedor. Cada proveedor es un adaptador con `enviar`.
//
// Variables en .env:
//   EMAIL_PROVEEDOR — "consola" (por defecto: imprime en la terminal, no envía nada) o "mailchimp"
//   EMAIL_REMITENTE — ej. "SupportDesk <soporte@empresa.com>"
//   FRONTEND_URL    — base de los enlaces de los emails (ej. http://localhost:5173)
//
// Para sumar otro proveedor (Amazon SES, Resend...): escribir su adaptador y agregarlo a `PROVEEDORES`.
// El resto del código no cambia.

export interface EmailSaliente {
  para: { nombre: string; email: string }
  asunto: string
  html: string
  texto: string
}

export interface ProveedorEmail {
  enviar: (email: EmailSaliente, remitente: string) => Promise<void>
}

// Desarrollo: muestra el aviso en la terminal del backend (destinatario, asunto y texto)
const proveedorConsola: ProveedorEmail = {
  enviar: async (email, remitente) => {
    console.log(
      [
        '📧 [email:consola] ─────────────────────────',
        `De:     ${remitente}`,
        `Para:   ${email.para.nombre} <${email.para.email}>`,
        `Asunto: ${email.asunto}`,
        '',
        email.texto,
        '─────────────────────────────────────────────'
      ].join('\n')
    )
  }
}

const PROVEEDORES: Record<string, ProveedorEmail> = {
  consola: proveedorConsola,
  mailchimp: proveedorMailchimp
}

const REMITENTE_POR_DEFECTO = 'SupportDesk <no-reply@localhost>'

export const remitenteConfigurado = (): string => process.env.EMAIL_REMITENTE || REMITENTE_POR_DEFECTO

export const obtenerProveedor = (): ProveedorEmail => {
  const nombre = (process.env.EMAIL_PROVEEDOR || 'consola').toLowerCase()
  const proveedor = PROVEEDORES[nombre]
  if (!proveedor) {
    console.warn(`[email] Proveedor "${nombre}" no existe; se usa "consola"`)
    return proveedorConsola
  }
  return proveedor
}

export const urlFrontend = (): string => origenesFrontend()[0]

// Nunca lanza: un fallo de email se registra pero no rompe la acción que lo disparó
export const enviarEmail = async (email: EmailSaliente): Promise<void> => {
  try {
    await obtenerProveedor().enviar(email, remitenteConfigurado())
  } catch (error) {
    console.error(`[email] No se pudo enviar "${email.asunto}" a ${email.para.email}:`, error)
  }
}
