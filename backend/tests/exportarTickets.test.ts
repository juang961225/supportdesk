import { armarFilas, columnasExportacion, fechaParaExcel, formatFechaHora, nombreArchivo, resumenReporte, valorParaPdf, TicketExportable } from '../src/utils/exportarTickets'
import { bog } from './helpers'

const ticket = (extra: Partial<TicketExportable> = {}): TicketExportable => ({
  _id: 't1',
  titulo: 'Impresora',
  estado: 'en_progreso',
  prioridad: 'critica',
  createdAt: bog('2026-10-27T09:05'),
  fechaLimite: bog('2026-10-27T13:05'),
  area: { nombre: 'Redes' },
  categoria: { nombre: 'Hardware' },
  creadoPor: { nombre: 'Ana' },
  asignadoA: { nombre: 'Luis' },
  marca: { nombre: 'BMW' },
  ...extra
})

describe('armarFilas', () => {
  it('traduce estado, prioridad y SLA y calcula el tiempo laboral', () => {
    const [fila] = armarFilas([ticket()], new Map([['t1', { minutosLaborales: 570, sla: 'vencido' as const }]]))
    expect(fila).toMatchObject({
      titulo: 'Impresora', estado: 'En progreso', prioridad: 'Crítica', area: 'Redes', marca: 'BMW',
      asignadoA: 'Luis', tiempoLaboral: '9 h 30 min', horasLaborales: 9.5, sla: 'Vencido', vencido: true, cerrado: null
    })
  })

  it('rellena lo que falta y solo muestra la fecha de cierre si está cerrado', () => {
    const [abierto, cerrado] = armarFilas(
      [ticket({ _id: 'a', asignadoA: null, area: null, fechaCierre: bog('2026-10-28T10:00') }), ticket({ _id: 'c', estado: 'cerrado', fechaCierre: bog('2026-10-28T10:00') })],
      new Map()
    )
    expect(abierto).toMatchObject({ asignadoA: 'Sin asignar', area: 'Sin área', cerrado: null, sla: 'Sin fecha límite', tiempoLaboral: '0 min' })
    expect(cerrado.cerrado).toEqual(bog('2026-10-28T10:00'))
  })
})

describe('columnasExportacion', () => {
  it('la marca solo aparece para el superadmin', () => {
    expect(columnasExportacion('xlsx', false).map((c) => c.clave)).not.toContain('marca')
    expect(columnasExportacion('xlsx', true).map((c) => c.clave)).toContain('marca')
    expect(columnasExportacion('pdf', true).length).toBeLessThan(columnasExportacion('xlsx', true).length)
  })
})

describe('resumenReporte', () => {
  it('cuenta por estado (en el orden del flujo, sin ceros) y los vencidos', () => {
    const filas = armarFilas(
      [ticket({ _id: '1' }), ticket({ _id: '2', estado: 'abierto' }), ticket({ _id: '3' })],
      new Map([['1', { minutosLaborales: 60, sla: 'vencido' as const }]])
    )
    expect(resumenReporte(filas)).toEqual({
      total: 3,
      porEstado: [{ estado: 'Abierto', total: 1 }, { estado: 'En progreso', total: 2 }],
      vencidos: 1
    })
  })
})

describe('fechas en hora Colombia', () => {
  it('formatea sin depender de la zona del servidor', () => {
    expect(formatFechaHora(bog('2026-10-27T09:05'))).toBe('27/10/2026 09:05')
    expect(formatFechaHora(bog('2026-10-27T23:30'))).toBe('27/10/2026 23:30')
  })

  it('Excel recibe la hora de Colombia como si fuera UTC', () => {
    expect(fechaParaExcel(bog('2026-10-27T09:05')).toISOString()).toBe('2026-10-27T09:05:00.000Z')
  })

  it('el nombre del archivo usa la fecha de Colombia', () => {
    expect(nombreArchivo('xlsx', new Date('2026-10-28T03:00:00Z'))).toBe('tickets-2026-10-27.xlsx')
    expect(nombreArchivo('pdf', bog('2026-10-28T08:00'))).toBe('tickets-2026-10-28.pdf')
  })

  it('valorParaPdf muestra fechas legibles y "—" si falta', () => {
    const [fila] = armarFilas([ticket()], new Map())
    expect(valorParaPdf(fila, 'creado')).toBe('27/10/2026 09:05')
    expect(valorParaPdf(fila, 'cerrado')).toBe('—')
    expect(valorParaPdf(fila, 'titulo')).toBe('Impresora')
  })
})
