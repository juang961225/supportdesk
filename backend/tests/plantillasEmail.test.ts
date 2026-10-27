import { plantillaTicket, recortar } from '../src/utils/plantillasEmail'

const base = {
  resumen: 'Ana comentó:',
  ticketTitulo: 'Impresora del piso 3',
  enlace: 'http://localhost:5173/usuario/tickets/123'
}

describe('plantillaTicket', () => {
  it('escapa en el HTML todo lo que viene de usuarios', () => {
    const { html } = plantillaTicket({ ...base, ticketTitulo: 'Falla <script>alert(1)</script> & "x"', extracto: '<img src=x onerror=alert(1)>' })
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img')
    expect(html).toContain('Falla &lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;x&quot;')
  })

  it('incluye el enlace en el botón y en la versión de texto', () => {
    const { html, texto } = plantillaTicket(base)
    expect(html).toContain(`href="${base.enlace}"`)
    expect(texto).toContain(`Ver ticket: ${base.enlace}`)
  })

  it('omite detalle y extracto cuando no vienen', () => {
    const { html, texto } = plantillaTicket(base)
    expect(html).not.toContain('<blockquote')
    expect(texto).not.toMatch(/\n{3,}/) // sin líneas vacías dobles
  })

  it('el texto plano lleva resumen, título, detalle y extracto', () => {
    const { texto } = plantillaTicket({ ...base, detalle: 'Área: Redes · Prioridad: Alta', extracto: 'Sigue fallando' })
    expect(texto).toBe([
      'Ana comentó:',
      '',
      'Impresora del piso 3',
      'Área: Redes · Prioridad: Alta',
      '',
      '"Sigue fallando"',
      '',
      `Ver ticket: ${base.enlace}`
    ].join('\n'))
  })
})

describe('recortar', () => {
  it('compacta espacios y saltos de línea', () => {
    expect(recortar('  Ya revisé   el cable.\n\nSigue fallando.  ')).toBe('Ya revisé el cable. Sigue fallando.')
  })

  it('corta en el máximo con "…"', () => {
    const resultado = recortar('x'.repeat(400))
    expect(resultado).toHaveLength(300)
    expect(resultado.endsWith('…')).toBe(true)
  })

  it('no toca textos cortos', () => {
    expect(recortar('corto', 10)).toBe('corto')
  })
})
