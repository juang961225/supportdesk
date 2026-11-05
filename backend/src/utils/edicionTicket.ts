// Qué cambió al editar un ticket, para el historial. Sin cambios devuelve null (no se guarda nada).
// Conserva el texto anterior: lo que el usuario corrige queda disponible para el equipo.
export const describirEdicion = (
  actual: { titulo: string; descripcion: string },
  nuevo: { titulo: string; descripcion: string }
): { de?: string; a?: string; descripcionAnterior?: string } | null => {
  const cambiaTitulo = actual.titulo !== nuevo.titulo
  const cambiaDescripcion = actual.descripcion !== nuevo.descripcion
  if (!cambiaTitulo && !cambiaDescripcion) return null
  return {
    ...(cambiaTitulo ? { de: actual.titulo, a: nuevo.titulo } : {}),
    ...(cambiaDescripcion ? { descripcionAnterior: actual.descripcion } : {})
  }
}
