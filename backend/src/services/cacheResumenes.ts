import { CacheMemoria } from './cacheMemoria'

// Resúmenes caros de los dashboards (contadores, urgentes, tendencias): se recuerdan 30 s por marca
// y se borran apenas cambia un ticket de esa marca (avisarCambioTicket) o su horario.
// Así 100 pantallas recargando a la vez hacen el cálculo una sola vez.
export const cacheResumenes = new CacheMemoria<unknown>(30 * 1000)

export const claveResumenAdmin = (marca: string) => `marca:${marca}:resumen`
export const claveTendencias = (marca: string, dias: number) => `marca:${marca}:tendencias:${dias}`
export const CLAVE_RESUMEN_SUPERADMIN = 'global:resumen'

export const invalidarResumenesDeMarca = (marca: string): void => {
  cacheResumenes.borrarPorPrefijo(`marca:${marca}:`)
  cacheResumenes.borrar(CLAVE_RESUMEN_SUPERADMIN) // el superadmin ve todas las marcas
}
