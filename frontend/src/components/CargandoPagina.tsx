// Mientras se recupera la sesión o se descarga una pantalla
function CargandoPagina() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <p className="text-sm text-gray-500 dark:text-gray-400" role="status">Cargando…</p>
    </div>
  )
}

export default CargandoPagina
