// Orígenes del frontend (FRONTEND_URL, separados por coma si hay varios).
// Se usan para CORS con credenciales y para los enlaces de los emails (el primero).
export const origenesFrontend = (): string[] => {
  const lista = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean)
  return lista.length > 0 ? lista : ['http://localhost:5173']
}
