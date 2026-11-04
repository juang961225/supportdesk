// Sub-marcas con las que arranca una marca existente (migración). Función pura.
// La primera es la que reciben por defecto los tickets que aún no tienen sub-marca.

export interface SubMarcaInicial {
  nombre: string
  onlineBriefId?: number
}

// Los ids son los brand_id de los catálogos de Online Brief
const SUBMARCAS_BMW: SubMarcaInicial[] = [
  { nombre: 'BMW', onlineBriefId: 0 },
  { nombre: 'MINI', onlineBriefId: 1 },
  { nombre: 'BMW Motorrad', onlineBriefId: 2 },
  { nombre: 'BMWi', onlineBriefId: 3 }
]

export const submarcasIniciales = (nombreMarca: string): SubMarcaInicial[] =>
  nombreMarca.trim().toLowerCase() === 'bmw' ? SUBMARCAS_BMW : [{ nombre: 'General' }]
