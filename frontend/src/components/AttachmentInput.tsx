import { useRef } from 'react'
import { useAgregarAdjuntos } from '../hooks/useAgregarAdjuntos'
import { MAX_ARCHIVOS, ACCEPT_ADJUNTOS, formatTamano } from '../utils/attachments'

interface AttachmentInputProps {
  files: File[]
  onChange: (files: File[]) => void
  disabled?: boolean
}

// Selector de archivos con chips; valida tipo, tamaño y cantidad antes de enviar
function AttachmentInput({ files, onChange, disabled = false }: AttachmentInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const agregar = useAgregarAdjuntos(files, onChange)

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seleccionados = Array.from(e.target.files ?? [])
    e.target.value = '' // permite volver a elegir el mismo archivo
    agregar(seleccionados)
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ADJUNTOS}
        onChange={handleSelect}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || files.length >= MAX_ARCHIVOS}
        className="text-xs px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        📎 Adjuntar archivos
      </button>
      <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
        Imágenes, PDF, Word, Excel, CSV o TXT · máx. 10 MB · hasta {MAX_ARCHIVOS} · también puedes pegar o arrastrar
      </span>

      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2 mt-2">
          {files.map((archivo, i) => (
            <li
              key={`${archivo.name}-${i}`}
              className="flex items-center gap-2 text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              {archivo.name} <span className="text-gray-400">({formatTamano(archivo.size)})</span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                disabled={disabled}
                className="text-red-600 dark:text-red-400 hover:underline"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default AttachmentInput
