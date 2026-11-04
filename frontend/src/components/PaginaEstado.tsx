interface PaginaEstadoProps {
  codigo?: string
  titulo: string
  mensaje: string
  children: React.ReactNode // acciones (botones o enlaces)
}

// Pantalla completa para avisos sin el menú de la app: 404, sin permiso y errores inesperados
function PaginaEstado({ codigo, titulo, mensaje, children }: PaginaEstadoProps) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="max-w-md text-center">
        {codigo && <p className="text-5xl font-bold text-gray-300 dark:text-gray-600 mb-4">{codigo}</p>}
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{titulo}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{mensaje}</p>
        <div className="flex flex-wrap justify-center gap-3">{children}</div>
      </div>
    </main>
  )
}

export const botonPrincipal = 'px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors'
export const botonSecundario = 'px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors'

export default PaginaEstado
