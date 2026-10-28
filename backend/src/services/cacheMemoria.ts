// Caché en memoria del proceso con vencimiento (TTL). Sirve para un solo servidor; con varias instancias
// habría que pasar a algo compartido (ej. Redis). Tope de entradas para no crecer sin límite.

const MAX_ENTRADAS = 2000

export class CacheMemoria<T> {
  private readonly datos = new Map<string, { valor: T; expira: number }>()

  constructor(private readonly ttlMs: number) {}

  obtener(clave: string): T | undefined {
    const entrada = this.datos.get(clave)
    if (!entrada) return undefined
    if (entrada.expira <= Date.now()) {
      this.datos.delete(clave)
      return undefined
    }
    return entrada.valor
  }

  guardar(clave: string, valor: T): void {
    if (this.datos.size >= MAX_ENTRADAS) {
      // La más antigua sale primero (los Map recuerdan el orden de inserción)
      const primera = this.datos.keys().next().value
      if (primera !== undefined) this.datos.delete(primera)
    }
    this.datos.set(clave, { valor, expira: Date.now() + this.ttlMs })
  }

  borrar(clave: string): void {
    this.datos.delete(clave)
  }

  borrarPorPrefijo(prefijo: string): void {
    for (const clave of this.datos.keys()) if (clave.startsWith(prefijo)) this.datos.delete(clave)
  }

  limpiar(): void {
    this.datos.clear()
  }

  // Devuelve lo guardado o lo calcula y lo guarda
  async obtenerOCalcular(clave: string, calcular: () => Promise<T>): Promise<T> {
    const guardado = this.obtener(clave)
    if (guardado !== undefined) return guardado
    const valor = await calcular()
    this.guardar(clave, valor)
    return valor
  }
}
