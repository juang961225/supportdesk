// Envía un solo correo de prueba con el proveedor configurado, sin tocar tickets ni usuarios.
// Uso: npm run email:prueba -- tu@correo.com
import dotenv from 'dotenv'
import { obtenerProveedor, remitenteConfigurado } from '../services/email'

dotenv.config()

const probar = async () => {
  const destino = process.argv[2]
  if (!destino) {
    console.error('Indica el destinatario: npm run email:prueba -- tu@correo.com')
    process.exit(1)
  }

  const remitente = remitenteConfigurado()
  console.log(`Proveedor: ${process.env.EMAIL_PROVEEDOR || 'consola'} · Remitente: ${remitente} · Para: ${destino}`)

  await obtenerProveedor().enviar(
    {
      para: { nombre: destino, email: destino },
      asunto: '[SupportDesk] Correo de prueba',
      html: '<p>Si lees esto, el envío de correos de SupportDesk funciona.</p>',
      texto: 'Si lees esto, el envío de correos de SupportDesk funciona.'
    },
    remitente
  )
  console.log('El proveedor aceptó el correo. Revisa la bandeja de entrada y la carpeta de spam.')
}

probar().catch((error: unknown) => {
  console.error('No se pudo enviar:', error instanceof Error ? error.message : error)
  process.exit(1)
})
