import fs from 'fs/promises'
import path from 'path'
import mongoose from 'mongoose'
import SubMarca from '../models/SubMarca'
import { Catalogo, ContextoTicket, ContextoUsuario, normalizarCatalogo, resolverContextoTicket } from '../utils/contextoUsuario'

// Catálogos de Online Brief, leídos de un JSON local (concesionarios y modelos cambian seguido; más adelante se
// decidirá si se importan o sincronizan). Si el archivo cambia se vuelve a leer sin reiniciar el servidor.
// Si falta o está dañado, el contexto se omite: nunca impide crear tickets.
//
// Variable en .env: CATALOGO_ONLINE_BRIEF_PATH (por defecto migracion/catalogs.json)

const RUTA_POR_DEFECTO = 'migracion/catalogs.json'

let enMemoria: { modificado: number; catalogo: Catalogo } | null = null
let ultimoAviso = ''

const avisarUnaVez = (mensaje: string): void => {
  if (mensaje !== ultimoAviso) console.warn(`[catalogo] ${mensaje}`)
  ultimoAviso = mensaje
}

export const obtenerCatalogo = async (): Promise<Catalogo | null> => {
  const ruta = path.resolve(process.cwd(), process.env.CATALOGO_ONLINE_BRIEF_PATH || RUTA_POR_DEFECTO)
  try {
    const { mtimeMs } = await fs.stat(ruta)
    if (enMemoria?.modificado === mtimeMs) return enMemoria.catalogo
    const catalogo = normalizarCatalogo(JSON.parse(await fs.readFile(ruta, 'utf8')))
    enMemoria = { modificado: mtimeMs, catalogo }
    ultimoAviso = ''
    return catalogo
  } catch (error) {
    avisarUnaVez(`No se pudo leer ${ruta}: ${error instanceof Error ? error.message : 'error'}`)
    return enMemoria?.catalogo ?? null // si el archivo se daña, se sigue con la última versión buena
  }
}

// La marca usa el contexto si alguna de sus sub-marcas está ligada a Online Brief (hoy, solo BMW)
export const marcaUsaContexto = async (marca: mongoose.Types.ObjectId | string | undefined): Promise<boolean> =>
  Boolean(marca && (await SubMarca.exists({ marca, onlineBriefId: { $exists: true, $ne: null } })))

// El catálogo si la marca lo usa; null si no aplica o no está disponible
export const catalogoDeMarca = async (marca: mongoose.Types.ObjectId | string | undefined): Promise<Catalogo | null> =>
  (await marcaUsaContexto(marca)) ? obtenerCatalogo() : null

export const contextoDelTicket = async (
  marca: mongoose.Types.ObjectId | string,
  usuario: ContextoUsuario,
  sedeElegida: string | undefined,
  brandId: number | undefined
): Promise<{ ok: true; contexto?: ContextoTicket } | { ok: false; mensaje: string }> => {
  const catalogo = await catalogoDeMarca(marca)
  return catalogo ? resolverContextoTicket(usuario, sedeElegida, brandId, catalogo) : { ok: true }
}
