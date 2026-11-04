import { actorParaDestinatario, comentarioParaRol, ticketParaRol } from '../src/utils/privacidadTicket'

const SOPORTE = { _id: 'id-soporte', nombre: 'Oscar', email: 'oscar@empresa.com', rol: 'soporte' }

describe('ticketParaRol', () => {
  const ticket = { titulo: 'T', asignadoA: { _id: 'id-soporte', nombre: 'Oscar' }, area: { nombre: 'Soporte N2' } }

  it('el usuario final no recibe al soporte asignado, pero sí el área', () => {
    const visible = ticketParaRol(ticket, 'usuario')
    expect(visible).not.toHaveProperty('asignadoA')
    expect(JSON.stringify(visible)).not.toContain('Oscar')
    expect(visible).toHaveProperty('area', { nombre: 'Soporte N2' })
  })

  it('el equipo sigue viendo a quién está asignado', () => {
    for (const rol of ['soporte', 'admin', 'superadmin']) expect(ticketParaRol(ticket, rol)).toEqual(ticket)
  })
})

describe('comentarioParaRol', () => {
  const comentario = { contenido: 'Hola', autor: SOPORTE }

  it('el usuario final ve el área, sin nombre, id ni correo', () => {
    const visible = comentarioParaRol(comentario, 'usuario', 'Soporte N2')
    expect(visible.autor).toEqual({ _id: 'equipo', nombre: 'Soporte N2', rol: 'soporte' })
    const texto = JSON.stringify(visible)
    expect(texto).not.toContain('Oscar')
    expect(texto).not.toContain('oscar@empresa.com')
    expect(texto).not.toContain('id-soporte')
  })

  it('también oculta al admin', () => {
    expect(comentarioParaRol({ autor: { ...SOPORTE, rol: 'admin' } }, 'usuario', 'Soporte N2').autor).toMatchObject({ nombre: 'Soporte N2' })
  })

  it('sin área dice el equipo de soporte', () => {
    expect(comentarioParaRol(comentario, 'usuario', undefined).autor).toMatchObject({ nombre: 'El equipo de soporte' })
  })

  it('otro usuario conserva su nombre', () => {
    const deUsuario = { autor: { _id: 'u', nombre: 'Karen', rol: 'usuario' } }
    expect(comentarioParaRol(deUsuario, 'usuario', 'Soporte N2')).toEqual(deUsuario)
  })

  it('el equipo ve quién comentó', () => {
    expect(comentarioParaRol(comentario, 'soporte', 'Soporte N2')).toEqual(comentario)
  })
})

describe('actorParaDestinatario', () => {
  it('al usuario final le llega el área', () => {
    expect(actorParaDestinatario(SOPORTE, 'usuario', 'Soporte N2')).toBe('Soporte N2')
  })

  it('al equipo le llega el nombre', () => {
    expect(actorParaDestinatario(SOPORTE, 'admin', 'Soporte N2')).toBe('Oscar')
  })

  it('entre usuarios finales se conserva el nombre', () => {
    expect(actorParaDestinatario({ nombre: 'Karen', rol: 'usuario' }, 'usuario', 'Soporte N2')).toBe('Karen')
  })
})
