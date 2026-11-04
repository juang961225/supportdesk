import { armarMensaje, proveedorMailchimp, revisarRespuesta, separarRemitente } from '../src/services/emailMailchimp'

const CORREO = {
  para: { nombre: 'Ana', email: 'ana@empresa.com' },
  asunto: 'Asunto',
  html: '<p>Hola</p>',
  texto: 'Hola'
}

describe('separarRemitente', () => {
  it('separa nombre y email', () => {
    expect(separarRemitente('SupportDesk <soporte@empresa.com>')).toEqual({ nombre: 'SupportDesk', email: 'soporte@empresa.com' })
    expect(separarRemitente('"Soporte BMW" <soporte@empresa.com>')).toEqual({ nombre: 'Soporte BMW', email: 'soporte@empresa.com' })
  })

  it('acepta solo el email', () => {
    expect(separarRemitente('soporte@empresa.com')).toEqual({ email: 'soporte@empresa.com' })
    expect(separarRemitente('<soporte@empresa.com>')).toEqual({ email: 'soporte@empresa.com' })
  })
})

describe('armarMensaje', () => {
  it('lleva remitente, HTML, texto y destinatario', () => {
    expect(armarMensaje(CORREO, 'SupportDesk <soporte@empresa.com>')).toMatchObject({
      from_email: 'soporte@empresa.com',
      from_name: 'SupportDesk',
      subject: 'Asunto',
      html: '<p>Hola</p>',
      text: 'Hola',
      to: [{ email: 'ana@empresa.com', name: 'Ana', type: 'to' }]
    })
  })

  it('sin nombre de remitente no manda from_name', () => {
    expect(armarMensaje(CORREO, 'soporte@empresa.com')).not.toHaveProperty('from_name')
  })
})

describe('revisarRespuesta', () => {
  it.each(['sent', 'queued', 'scheduled'])('acepta el estado %s', (status) => {
    expect(() => revisarRespuesta(200, [{ email: 'ana@empresa.com', status }])).not.toThrow()
  })

  it('un 200 con el correo rechazado es un error y dice el motivo', () => {
    expect(() => revisarRespuesta(200, [{ status: 'rejected', reject_reason: 'unsigned' }])).toThrow(/rejected: unsigned/)
    expect(() => revisarRespuesta(200, [{ status: 'invalid' }])).toThrow(/invalid/)
  })

  it('un error del API dice el código y el mensaje', () => {
    expect(() => revisarRespuesta(500, { status: 'error', name: 'Invalid_Key', message: 'Invalid API key' }))
      .toThrow('Mailchimp respondió 500 (Invalid_Key: Invalid API key)')
  })

  it('una respuesta que no se entiende es un error', () => {
    expect(() => revisarRespuesta(200, [])).toThrow(/inesperada/)
    expect(() => revisarRespuesta(200, null)).toThrow(/inesperada/)
    expect(() => revisarRespuesta(502, null)).toThrow('Mailchimp respondió 502')
  })
})

describe('proveedorMailchimp', () => {
  const KEY_ORIGINAL = process.env.MAILCHIMP_API_KEY
  const fetchOriginal = global.fetch

  afterEach(() => {
    global.fetch = fetchOriginal
    if (KEY_ORIGINAL === undefined) delete process.env.MAILCHIMP_API_KEY
    else process.env.MAILCHIMP_API_KEY = KEY_ORIGINAL
  })

  it('sin API key no llama a Mailchimp', async () => {
    delete process.env.MAILCHIMP_API_KEY
    const falsoFetch = jest.fn<Promise<Response>, Parameters<typeof fetch>>()
    global.fetch = falsoFetch
    await expect(proveedorMailchimp.enviar(CORREO, 'soporte@empresa.com')).rejects.toThrow('Falta MAILCHIMP_API_KEY')
    expect(falsoFetch).not.toHaveBeenCalled()
  })

  it('envía la key en el cuerpo y no la expone si falla', async () => {
    process.env.MAILCHIMP_API_KEY = 'clave-de-prueba'
    const falsoFetch = jest.fn<Promise<Response>, Parameters<typeof fetch>>().mockResolvedValue(
      new Response(JSON.stringify([{ status: 'rejected', reject_reason: 'unsigned' }]), { status: 200 })
    )
    global.fetch = falsoFetch

    const error: unknown = await proveedorMailchimp.enviar(CORREO, 'soporte@empresa.com').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).not.toContain('clave-de-prueba')

    const [url, opciones] = falsoFetch.mock.calls[0]
    expect(url).toBe('https://mandrillapp.com/api/1.3/messages/send')
    expect(JSON.parse(String(opciones?.body)).key).toBe('clave-de-prueba')
  })
})
