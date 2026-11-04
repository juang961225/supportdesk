// Contexto del usuario según los catálogos de Online Brief: organización, concesionario e importador.
// Es información, no permisos: clasifica los tickets para filtrar y reportar. Funciones puras.
//
// En Online Brief cada concesionario o importador tiene una entrada por sub-marca (brand_id), y es lo que
// referencian sus usuarios. Por eso aquí una "sede" es una entrada: "c:<brand_id>:<id>" o "i:<brand_id>:<id>".

export const ORG_MEXICO = 0 // id de "MX" en el catálogo: sus usuarios tienen concesionarios
export const ORG_LATAM = 1 // id de "LATAM" en el catálogo: sus usuarios tienen importadores
export const SEDE_CORPORATIVO = 'corporativo'
const NOMBRE_CORPORATIVO = 'Corporativo'

export type TipoSede = 'concesionario' | 'importador'

export interface Sede {
  clave: string
  tipo: TipoSede
  nombre: string
  brandId: number
  subMarca: string
}

export interface Catalogo {
  organizaciones: { id: number; nombre: string }[]
  sedes: Sede[]
}

export interface ContextoUsuario {
  organizaciones: number[]
  sedes: string[]
  todosConcesionarios: boolean
  todosImportadores: boolean
}

export interface ContextoTicket {
  organizacion?: string
  tipo?: TipoSede | typeof SEDE_CORPORATIVO
  clave?: string
  nombre?: string
}

export const CONTEXTO_VACIO: ContextoUsuario = { organizaciones: [], sedes: [], todosConcesionarios: false, todosImportadores: false }

const esObjeto = (valor: unknown): valor is Record<string, unknown> => typeof valor === 'object' && valor !== null
const lista = (valor: unknown): Record<string, unknown>[] => (Array.isArray(valor) ? valor.filter(esObjeto) : [])

// Convierte el JSON de Online Brief. Las entradas deshabilitadas no se ofrecen. Hay ids repetidos con la misma
// sub-marca (una entrada activa y otra deshabilitada): al quedar solo las activas, la clave no se repite.
export const normalizarCatalogo = (crudo: unknown): Catalogo => {
  const datos = esObjeto(crudo) ? crudo : {}
  const nombresSubMarca = new Map(lista(datos.brands).map((b) => [Number(b.id), String(b.name)]))

  const leerSedes = (entradas: unknown, tipo: TipoSede, prefijo: string): Sede[] =>
    lista(entradas)
      .filter((e) => e.enabled === true && typeof e.id === 'number' && typeof e.brand_id === 'number' && typeof e.name === 'string')
      .map((e) => ({
        clave: `${prefijo}:${String(e.brand_id)}:${String(e.id)}`,
        tipo,
        nombre: String(e.name).trim(),
        brandId: Number(e.brand_id),
        subMarca: nombresSubMarca.get(Number(e.brand_id)) ?? ''
      }))

  const unicas = new Map<string, Sede>()
  for (const sede of [...leerSedes(datos.dealers, 'concesionario', 'c'), ...leerSedes(datos.importers, 'importador', 'i')]) {
    if (!unicas.has(sede.clave)) unicas.set(sede.clave, sede)
  }

  return {
    organizaciones: lista(datos.organizations).map((o) => ({ id: Number(o.id), nombre: String(o.name) })),
    sedes: [...unicas.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es') || a.subMarca.localeCompare(b.subMarca, 'es'))
  }
}

const organizacionDeSede = (tipo: TipoSede): number => (tipo === 'concesionario' ? ORG_MEXICO : ORG_LATAM)

// Lo que el usuario puede elegir: sus sedes, o todas las de la organización si es corporativo
export const sedesPermitidas = (usuario: ContextoUsuario, catalogo: Catalogo): Sede[] =>
  catalogo.sedes.filter((sede) => {
    if (!usuario.organizaciones.includes(organizacionDeSede(sede.tipo))) return false
    const todas = sede.tipo === 'concesionario' ? usuario.todosConcesionarios : usuario.todosImportadores
    return todas || usuario.sedes.includes(sede.clave)
  })

export const tieneTodas = (usuario: ContextoUsuario): boolean =>
  (usuario.todosConcesionarios && usuario.organizaciones.includes(ORG_MEXICO)) ||
  (usuario.todosImportadores && usuario.organizaciones.includes(ORG_LATAM))

// Sin organizaciones configuradas, la sub-marca aplica a todas (BMWi: solo México)
export const subMarcaAplica = (organizacionesSubMarca: number[] | undefined, organizacionesUsuario: number[] | undefined): boolean =>
  !organizacionesSubMarca?.length || organizacionesSubMarca.some((o) => organizacionesUsuario?.includes(o))

// Valida lo que el admin asignó y descarta lo que no corresponde a sus organizaciones
export const limpiarContexto = (
  entrada: ContextoUsuario,
  catalogo: Catalogo
): { ok: true; contexto: ContextoUsuario } | { ok: false; mensaje: string } => {
  const organizaciones = [...new Set(entrada.organizaciones)]
  const conocidas = new Set(catalogo.organizaciones.map((o) => o.id))
  if (organizaciones.some((o) => !conocidas.has(o))) return { ok: false, mensaje: 'Alguna de las organizaciones no existe' }

  const porClave = new Map(catalogo.sedes.map((s) => [s.clave, s]))
  const sedes = [...new Set(entrada.sedes)]
  if (sedes.some((clave) => !porClave.has(clave))) {
    return { ok: false, mensaje: 'Alguno de los concesionarios o importadores no existe o está deshabilitado' }
  }

  return {
    ok: true,
    contexto: {
      organizaciones,
      sedes: sedes.filter((clave) => organizaciones.includes(organizacionDeSede((porClave.get(clave) as Sede).tipo))),
      todosConcesionarios: entrada.todosConcesionarios && organizaciones.includes(ORG_MEXICO),
      todosImportadores: entrada.todosImportadores && organizaciones.includes(ORG_LATAM)
    }
  }
}

const nombreOrganizacion = (id: number, catalogo: Catalogo): string | undefined =>
  catalogo.organizaciones.find((o) => o.id === id)?.nombre

// Lo que se copia al ticket al crearlo: si el usuario cambia después, sus tickets y reportes no cambian.
// `brandId` es el de la sub-marca del ticket: cada entrada del catálogo pertenece a una sola sub-marca.
export const resolverContextoTicket = (
  usuario: ContextoUsuario,
  sedeElegida: string | undefined,
  brandId: number | undefined,
  catalogo: Catalogo
): { ok: true; contexto?: ContextoTicket } | { ok: false; mensaje: string } => {
  if (usuario.organizaciones.length === 0) return { ok: true }

  const opciones = sedesPermitidas(usuario, catalogo).filter((s) => brandId === undefined || s.brandId === brandId)
  const corporativo = tieneTodas(usuario)
  const organizacionUnica = usuario.organizaciones.length === 1 ? nombreOrganizacion(usuario.organizaciones[0], catalogo) : undefined

  const deSede = (sede: Sede): ContextoTicket => ({
    organizacion: nombreOrganizacion(organizacionDeSede(sede.tipo), catalogo),
    tipo: sede.tipo,
    clave: sede.clave,
    nombre: sede.nombre
  })
  const general: ContextoTicket = { organizacion: organizacionUnica, tipo: SEDE_CORPORATIVO, clave: SEDE_CORPORATIVO, nombre: NOMBRE_CORPORATIVO }

  if (sedeElegida && sedeElegida !== SEDE_CORPORATIVO) {
    const sede = opciones.find((s) => s.clave === sedeElegida)
    return sede
      ? { ok: true, contexto: deSede(sede) }
      : { ok: false, mensaje: 'Ese concesionario o importador no está disponible para ti en esa sub-marca' }
  }
  if (corporativo) return { ok: true, contexto: general }
  if (sedeElegida === SEDE_CORPORATIVO) return { ok: false, mensaje: 'Solo los usuarios corporativos pueden crear tickets generales' }
  if (opciones.length === 1) return { ok: true, contexto: deSede(opciones[0]) }
  if (opciones.length > 1) return { ok: false, mensaje: 'Selecciona el concesionario o importador del ticket' }
  return { ok: true, contexto: organizacionUnica ? { organizacion: organizacionUnica } : undefined }
}
