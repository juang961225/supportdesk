import {
  passwordNueva, esquemaLogin, esquemaCrearUsuario, esquemaEditarUsuario, esquemaCrearTicket,
  esquemaComentario, esquemaFechaLimite, esquemaEstadoArea, esquemaEditarCategoria
} from '../src/validacion/esquemas'

const ID = '64b7f0c2a1b2c3d4e5f60718'
const primerError = (r: { success: boolean; error?: { issues: { message: string }[] } }) => r.error?.issues[0]?.message

describe('passwordNueva (contraseñas creadas o cambiadas en SupportDesk)', () => {
  it.each([
    ['corta', 'abc12', 'al menos 8 caracteres'],
    ['sin números', 'soloLetras', 'al menos un número'],
    ['sin letras', '12345678', 'al menos una letra'],
    ['demasiado larga', 'a1'.repeat(40), 'no puede superar 72']
  ])('rechaza: %s', (_caso, valor, mensaje) => {
    expect(primerError(passwordNueva.safeParse(valor))).toContain(mensaje)
  })

  it('acepta 8+ con letra y número (también con tildes, ñ o símbolos)', () => {
    expect(passwordNueva.safeParse('clave2026').success).toBe(true)
    expect(passwordNueva.safeParse('Ñandú#9x').success).toBe(true)
  })
})

describe('esquemaLogin', () => {
  it('normaliza el email y no aplica la política (las de Online Brief entran tal cual)', () => {
    expect(esquemaLogin.parse({ email: '  Ana@Empresa.COM ', password: 'q%9M6#21' })).toEqual({ email: 'ana@empresa.com', password: 'q%9M6#21' })
  })

  it('rechaza email inválido o contraseña vacía', () => {
    expect(primerError(esquemaLogin.safeParse({ email: 'no-es-email', password: 'x' }))).toBe('El email no es válido')
    expect(primerError(esquemaLogin.safeParse({ email: 'a@b.co', password: '' }))).toBe('La contraseña es obligatoria')
  })

  it('ignora intentos de inyección (objetos en vez de texto)', () => {
    expect(esquemaLogin.safeParse({ email: { $ne: null }, password: { $ne: null } }).success).toBe(false)
  })
})

describe('usuarios', () => {
  it('crear: valida rol y descarta campos que no existen', () => {
    const r = esquemaCrearUsuario.parse({ nombre: ' Ana ', email: 'ANA@x.com', password: 'clave2026', rol: 'soporte', esAdmin: true })
    expect(r).toEqual({ nombre: 'Ana', email: 'ana@x.com', password: 'clave2026', rol: 'soporte' })
    expect(primerError(esquemaCrearUsuario.safeParse({ nombre: 'A', email: 'a@x.com', password: 'clave2026', rol: 'superadmin' }))).toMatch(/Rol inválido/)
  })

  it('editar: contraseña vacía = no cambiarla; marca vacía = no viene', () => {
    expect(esquemaEditarUsuario.parse({ password: '', marcaId: '' })).toEqual({ password: '' })
    expect(primerError(esquemaEditarUsuario.safeParse({ password: 'corta1' }))).toContain('8 caracteres')
  })
})

describe('tickets y comentarios', () => {
  it('crear ticket: un observador o varios, prioridad válida, largos máximos', () => {
    const base = { titulo: 'Falla', descripcion: 'No imprime', prioridad: 'alta', categoriaId: ID }
    expect(esquemaCrearTicket.parse({ ...base, observadorIds: ID }).observadorIds).toBe(ID)
    expect(esquemaCrearTicket.parse({ ...base, observadorIds: [ID, ID] }).observadorIds).toEqual([ID, ID])
    expect(primerError(esquemaCrearTicket.safeParse({ ...base, prioridad: 'urgentisima' }))).toBe('Prioridad inválida')
    expect(primerError(esquemaCrearTicket.safeParse({ ...base, titulo: 'x'.repeat(151) }))).toContain('150')
    expect(primerError(esquemaCrearTicket.safeParse({ ...base, categoriaId: 'abc' }))).toBe('La categoría no tiene un formato válido')
  })

  it('comentario: puede venir vacío (solo adjuntos) y se recortan espacios', () => {
    expect(esquemaComentario.parse({})).toEqual({ contenido: '' })
    expect(esquemaComentario.parse({ contenido: '  hola  ' })).toEqual({ contenido: 'hola' })
  })

  it('fecha límite: ISO con zona y motivo obligatorio', () => {
    expect(esquemaFechaLimite.safeParse({ fechaLimite: '2026-10-30T15:00:00.000Z', motivo: 'Repuesto' }).success).toBe(true)
    expect(primerError(esquemaFechaLimite.safeParse({ fechaLimite: 'mañana', motivo: 'x' }))).toBe('La nueva fecha límite no es válida')
    expect(primerError(esquemaFechaLimite.safeParse({ fechaLimite: '2026-10-30T15:00:00Z', motivo: '   ' }))).toBe('El motivo es obligatorio')
  })
})

describe('áreas y categorías', () => {
  it('estado del área exige booleano', () => {
    expect(esquemaEstadoArea.safeParse({ activo: 'true' }).success).toBe(false)
    expect(esquemaEstadoArea.parse({ activo: false })).toEqual({ activo: false })
  })

  it('editar categoría acepta área vacía como "sin cambio"', () => {
    expect(esquemaEditarCategoria.parse({ nombre: 'Redes', areaId: '' })).toEqual({ nombre: 'Redes' })
  })
})

describe('mensajes con la concordancia correcta', () => {
  it('femenino y masculino', () => {
    expect(primerError(esquemaCrearTicket.safeParse({ titulo: 'x', prioridad: 'alta', categoriaId: ID }))).toBe('La descripción es obligatoria')
    expect(primerError(esquemaCrearTicket.safeParse({ descripcion: 'x', prioridad: 'alta', categoriaId: ID }))).toBe('El título es obligatorio')
    expect(primerError(esquemaCrearTicket.safeParse({ titulo: 'x', descripcion: 'x', prioridad: 'alta' }))).toBe('La categoría es obligatoria')
  })
})
