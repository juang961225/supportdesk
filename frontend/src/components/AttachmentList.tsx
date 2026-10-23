import type { Attachment } from '../types'
import { formatTamano } from '../utils/attachments'

interface AttachmentListProps {
  archivos: Attachment[]
}

// Muestra adjuntos: miniatura para imágenes, ícono + nombre para documentos.
// Las URLs son temporales (firmadas por el backend); si vencen, recargar la página las renueva.
function AttachmentList({ archivos }: AttachmentListProps) {
  if (archivos.length === 0) return null

  const imagenes = archivos.filter((a) => a.mime.startsWith('image/'))
  const documentos = archivos.filter((a) => !a.mime.startsWith('image/'))

  return (
    <div className="mt-2 space-y-2">
      {imagenes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {imagenes.map((a) => (
            <a
              key={a.key}
              href={a.url || undefined}
              target="_blank"
              rel="noopener noreferrer"
              title={a.nombre}
              className="block w-24 h-24 rounded border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-100 dark:bg-gray-700"
            >
              {a.url ? (
                <img src={a.url} alt={a.nombre} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-gray-400 p-1 block">{a.nombre}</span>
              )}
            </a>
          ))}
        </div>
      )}

      {documentos.length > 0 && (
        <ul className="space-y-1">
          {documentos.map((a) => (
            <li key={a.key}>
              <a
                href={a.url || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                📄 {a.nombre}
                <span className="text-xs text-gray-400 dark:text-gray-500">({formatTamano(a.tamano)})</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default AttachmentList
