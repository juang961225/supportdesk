import { describirEdicion } from '../src/utils/edicionTicket'
import { ticketParaRol } from '../src/utils/privacidadTicket'

const ACTUAL = { titulo: 'Título', descripcion: 'Descripción' }

describe('describirEdicion', () => {
  it('sin cambios no registra nada', () => {
    expect(describirEdicion(ACTUAL, { ...ACTUAL })).toBeNull()
  })

  it('guarda el título anterior y el nuevo', () => {
    expect(describirEdicion(ACTUAL, { ...ACTUAL, titulo: 'Otro' })).toEqual({ de: 'Título', a: 'Otro' })
  })

  it('guarda la descripción anterior', () => {
    expect(describirEdicion(ACTUAL, { ...ACTUAL, descripcion: 'Otra' })).toEqual({ descripcionAnterior: 'Descripción' })
  })

  it('registra ambos si cambian los dos', () => {
    expect(describirEdicion(ACTUAL, { titulo: 'Otro', descripcion: 'Otra' })).toEqual({ de: 'Título', a: 'Otro', descripcionAnterior: 'Descripción' })
  })
})

describe('sinAtender para el usuario final', () => {
  it('es cierto si no tiene asignado y no está cerrado', () => {
    expect(ticketParaRol({ estado: 'abierto' }, 'usuario')).toHaveProperty('sinAtender', true)
  })

  it('es falso si ya lo atienden, sin revelar quién', () => {
    const visible = ticketParaRol({ estado: 'en_progreso', asignadoA: { nombre: 'Oscar' } }, 'usuario')
    expect(visible).toHaveProperty('sinAtender', false)
    expect(JSON.stringify(visible)).not.toContain('Oscar')
  })

  it('es falso si está cerrado', () => {
    expect(ticketParaRol({ estado: 'cerrado' }, 'usuario')).toHaveProperty('sinAtender', false)
  })

  it('el equipo no lo recibe', () => {
    expect(ticketParaRol({ estado: 'abierto' }, 'soporte')).not.toHaveProperty('sinAtender')
  })
})
