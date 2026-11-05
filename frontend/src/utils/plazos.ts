import type { AjustePlazos, Plazo, Plazos, Prioridad, UnidadPlazo } from '../types'

// De la más urgente a la menos: así se muestran
export const PRIORIDADES: Prioridad[] = ['critica', 'alta', 'media', 'baja']

// Lo que se escribe en el formulario: una fila vacía significa "usa el de la marca"
export type FilaPlazo = { valor: string; unidad: UnidadPlazo }
export type FormularioPlazos = Record<Prioridad, FilaPlazo>

export const formatPlazo = ({ valor, unidad }: Plazo): string => {
  if (unidad === 'horas') return `${valor} h`
  return valor === 1 ? '1 día' : `${valor} días`
}

export const aFormulario = (plazos: AjustePlazos | undefined, base?: Plazos): FormularioPlazos => {
  const formulario = {} as FormularioPlazos
  for (const prioridad of PRIORIDADES) {
    const plazo = plazos?.[prioridad]
    formulario[prioridad] = { valor: plazo ? String(plazo.valor) : '', unidad: plazo?.unidad ?? base?.[prioridad]?.unidad ?? 'dias' }
  }
  return formulario
}

const esValido = (valor: string): boolean => /^[1-9]\d{0,3}$/.test(valor.trim())

// Devuelve lo escrito, o null si alguna fila no es un número entero mayor que cero
export const deFormulario = (formulario: FormularioPlazos): AjustePlazos | null => {
  const plazos: AjustePlazos = {}
  for (const prioridad of PRIORIDADES) {
    const { valor, unidad } = formulario[prioridad]
    if (!valor.trim()) continue
    if (!esValido(valor)) return null
    plazos[prioridad] = { valor: Number(valor), unidad }
  }
  return plazos
}

// "Crítica 2 h · Alta 1 día", para la fila de cada área
export const resumenAjuste = (plazos: AjustePlazos | undefined, etiquetas: Record<Prioridad, string>): string =>
  PRIORIDADES.flatMap((p) => {
    const plazo = plazos?.[p]
    return plazo ? [`${etiquetas[p]} ${formatPlazo(plazo)}`] : []
  }).join(' · ')
