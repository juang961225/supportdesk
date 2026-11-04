import { passwordNueva } from '../validacion/esquemas'
import { Catalogo, Sede } from './contextoUsuario'

// Reglas y datos de la demo (funciones puras). Lo que escribe en la base está en scripts/seedDemo.ts

export const SLUG_DEMO_BMW = 'demo-bmw'
export const SLUG_DEMO_OTRA = 'demo-otra'

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Lo que impide correr la demo. En producción exige permiso explícito: el servidor de pruebas también
// corre con NODE_ENV=production, pero la base real de producción nunca debe recibir estos datos.
export const revisarEntornoSeed = (env: Record<string, string | undefined>): string[] => {
  const errores: string[] = []
  if (!env.MONGODB_URI) errores.push('Falta MONGODB_URI')
  if (!env.SEED_EMAIL || !EMAIL_VALIDO.test(env.SEED_EMAIL)) {
    errores.push('Falta SEED_EMAIL o no es válido: el buzón que recibirá los correos de los usuarios demo')
  }
  const password = passwordNueva.safeParse(env.SEED_PASSWORD)
  if (!password.success) errores.push(`SEED_PASSWORD: ${password.error.issues[0].message}`)
  if (env.NODE_ENV === 'production' && env.PERMITIR_SEED_DEMO !== 'si') {
    errores.push('NODE_ENV=production: solo en un servidor de pruebas, y con PERMITIR_SEED_DEMO=si. Nunca en la base real')
  }
  return errores
}

// "juan@gmail.com" + "admin" → "juan+demo.admin@gmail.com": todos llegan al mismo buzón
export const aliasDemo = (buzon: string, etiqueta: string): string => {
  const [local, dominio] = buzon.trim().toLowerCase().split('@')
  return `${local.split('+')[0]}+demo.${etiqueta}@${dominio}`
}

// Sedes reales del catálogo para los usuarios demo; las que falten quedan vacías
export const elegirSedesDemo = (catalogo: Catalogo): { bmw: Sede[]; mini: Sede[]; importador: Sede[] } => {
  const concesionarios = catalogo.sedes.filter((s) => s.tipo === 'concesionario')
  const importadores = catalogo.sedes.filter((s) => s.tipo === 'importador')
  return {
    bmw: concesionarios.filter((s) => s.brandId === 0).slice(0, 2),
    mini: concesionarios.filter((s) => s.brandId === 1).slice(0, 1),
    importador: importadores.slice(0, 1)
  }
}

export type EstadoDemo = 'abierto' | 'en_progreso' | 'en_revision' | 'cerrado' | 'reabierto'
export type PrioridadDemo = 'baja' | 'media' | 'alta' | 'critica'

export interface TicketDemo {
  titulo: string
  descripcion: string
  estado: EstadoDemo
  prioridad: PrioridadDemo
  diasAtras: number // reparte los tickets en las gráficas de 7, 30 y 90 días
}

const TEMAS: [string, string][] = [
  ['No carga el módulo de reportes', 'Al abrir reportes la pantalla queda en blanco desde esta mañana.'],
  ['Error al exportar a Excel', 'El archivo se descarga vacío cuando filtro por fechas.'],
  ['Solicitud de acceso para un usuario nuevo', 'Ingresó una persona al equipo y necesita acceso.'],
  ['La sesión se cierra sola', 'Me saca del sistema varias veces al día.'],
  ['Datos desactualizados en el tablero', 'Las cifras no coinciden con las del día anterior.'],
  ['No llegan las notificaciones', 'Dejé de recibir los avisos por correo.'],
  ['Cambio de responsable', 'Hay que actualizar el responsable de la sucursal.'],
  ['Lentitud en horas pico', 'El sistema tarda varios segundos al abrir cada pantalla.']
]

const ESTADOS: EstadoDemo[] = ['abierto', 'en_progreso', 'cerrado', 'en_revision', 'abierto', 'cerrado', 'reabierto', 'en_progreso']
const PRIORIDADES: PrioridadDemo[] = ['media', 'alta', 'baja', 'critica', 'alta', 'media']

// Siempre los mismos: cada corrida deja la demo igual. Incluye de hoy y de hace meses
export const ticketsDemo = (cantidad: number): TicketDemo[] =>
  Array.from({ length: cantidad }, (_, i) => {
    const [titulo, descripcion] = TEMAS[i % TEMAS.length]
    return {
      titulo: `${titulo} (${i + 1})`,
      descripcion,
      estado: ESTADOS[i % ESTADOS.length],
      prioridad: PRIORIDADES[i % PRIORIDADES.length],
      diasAtras: Math.round((i * i) / 8)
    }
  })
